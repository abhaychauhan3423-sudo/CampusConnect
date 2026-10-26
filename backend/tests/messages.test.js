process.env.JWT_SECRET = 'test_secret';
process.env.NODE_ENV = 'test';

const http = require('http');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ioClient = require('socket.io-client');
const app = require('../src/app');
const { initSocket } = require('../src/socket');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const generateToken = require('../src/utils/generateToken');

let mongod;
let server;
let serverPort;
let userA, userB, userC;
let tokenA, tokenB, tokenC;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  await Conversation.init();
  await Message.init();

  // Create an HTTP server and attach socket.io for integration tests
  server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => {
    server.listen(0, () => {
      serverPort = server.address().port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await User.deleteMany({});

  // Seed two primary students and a third bystander
  userA = await User.create({
    name: 'Alice Smith',
    email: 'alice@example.com',
    password: 'Password123!',
    college: 'MIT',
    course: 'Computer Science',
    year: 3,
  });
  tokenA = generateToken(userA._id);

  userB = await User.create({
    name: 'Bob Jones',
    email: 'bob@example.com',
    password: 'Password123!',
    college: 'Stanford',
    course: 'Electrical Eng',
    year: 2,
  });
  tokenB = generateToken(userB._id);

  userC = await User.create({
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    password: 'Password123!',
    college: 'Harvard',
    course: 'Economics',
    year: 1,
  });
  tokenC = generateToken(userC._id);
});

describe('Conversation REST Endpoints', () => {
  test('creates a new conversation between Alice and Bob', async () => {
    const res = await request(app)
      .post(`/api/messages/conversations/${userB._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.participants).toHaveLength(2);
    expect(res.body.data.participantKey).toBe(
      Conversation.getParticipantKey(userA._id, userB._id)
    );
  });

  test('does not create duplicate conversations for the same pair', async () => {
    // Alice requests conversation with Bob
    const res1 = await request(app)
      .post(`/api/messages/conversations/${userB._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Bob requests conversation with Alice
    const res2 = await request(app)
      .post(`/api/messages/conversations/${userA._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res1.body.data._id).toBe(res2.body.data._id);
    const count = await Conversation.countDocuments();
    expect(count).toBe(1);
  });

  test('prevents creating conversation with self', async () => {
    const res = await request(app)
      .post(`/api/messages/conversations/${userA._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
  });

  test('prevents unauthorized user from viewing conversation messages', async () => {
    // Alice & Bob have a conversation
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      participantKey: Conversation.getParticipantKey(userA._id, userB._id),
    });

    // Charlie tries to view it
    const res = await request(app)
      .get(`/api/messages/conversations/${conv._id}`)
      .set('Authorization', `Bearer ${tokenC}`);

    expect(res.status).toBe(403);
  });
});

describe('Message Expiry Lifecycle', () => {
  test('new message starts with null readAt and null expiresAt', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      participantKey: Conversation.getParticipantKey(userA._id, userB._id),
    });

    const msg = await Message.create({
      conversationId: conv._id,
      senderId: userA._id,
      recipientId: userB._id,
      text: 'Hey Bob, secret message!',
      readAt: null,
      expiresAt: null,
    });

    expect(msg.readAt).toBeNull();
    expect(msg.expiresAt).toBeNull();
  });

  test('markRead atomically sets readAt and expiresAt exactly 24 hours later', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      participantKey: Conversation.getParticipantKey(userA._id, userB._id),
    });

    const msg = await Message.create({
      conversationId: conv._id,
      senderId: userA._id,
      recipientId: userB._id,
      text: 'Expiring message',
      readAt: null,
      expiresAt: null,
    });

    const startTime = Date.now();

    // Bob reads the message
    const res = await request(app)
      .post(`/api/messages/conversations/${conv._id}/read`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);

    const updated = await Message.findById(msg._id);
    expect(updated.readAt).not.toBeNull();
    expect(updated.expiresAt).not.toBeNull();

    const readAtMs = new Date(updated.readAt).getTime();
    const expiresAtMs = new Date(updated.expiresAt).getTime();

    // Verification: expiresAt must be exactly 24 hours (86,400,000 ms) after readAt
    expect(expiresAtMs - readAtMs).toBe(24 * 60 * 60 * 1000);
    expect(readAtMs).toBeGreaterThanOrEqual(startTime);
  });

  test('re-reading an already read message does NOT restart or extend expiry', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      participantKey: Conversation.getParticipantKey(userA._id, userB._id),
    });

    const initialReadAt = new Date(Date.now() - 5000);
    const initialExpiresAt = new Date(initialReadAt.getTime() + 24 * 60 * 60 * 1000);

    const msg = await Message.create({
      conversationId: conv._id,
      senderId: userA._id,
      recipientId: userB._id,
      text: 'Already read message',
      readAt: initialReadAt,
      expiresAt: initialExpiresAt,
    });

    // Bob reads again
    const res = await request(app)
      .post(`/api/messages/conversations/${conv._id}/read`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0); // 0 new messages marked

    const after = await Message.findById(msg._id);
    expect(new Date(after.readAt).getTime()).toBe(initialReadAt.getTime());
    expect(new Date(after.expiresAt).getTime()).toBe(initialExpiresAt.getTime());
  });

  test('expired messages are filtered out from GET /conversations/:id and preview', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      participantKey: Conversation.getParticipantKey(userA._id, userB._id),
    });

    // Create an unexpired message
    const validMsg = await Message.create({
      conversationId: conv._id,
      senderId: userA._id,
      recipientId: userB._id,
      text: 'Still valid message',
      readAt: null,
      expiresAt: null,
    });

    // Create an already-expired message (expired 1 hour ago)
    const expiredMsg = await Message.create({
      conversationId: conv._id,
      senderId: userA._id,
      recipientId: userB._id,
      text: 'This message has expired and disappeared',
      readAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    });

    conv.lastMessage = expiredMsg._id;
    await conv.save();

    // Fetch conversation messages
    const res = await request(app)
      .get(`/api/messages/conversations/${conv._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id.toString()).toBe(validMsg._id.toString());

    // Fetch conversations list: preview must not show the expired message
    const listRes = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(listRes.status).toBe(200);
    const convItem = listRes.body.data.find((c) => c._id.toString() === conv._id.toString());
    expect(convItem.lastMessage._id.toString()).toBe(validMsg._id.toString());
  });
});

describe('Socket.IO Real-time Messaging and Authorization', () => {
  let socketA, socketB;

  const createSocket = (token) => {
    return ioClient(`http://localhost:${serverPort}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
  };

  afterEach(() => {
    if (socketA && socketA.connected) socketA.disconnect();
    if (socketB && socketB.connected) socketB.disconnect();
  });

  test('authenticates socket connections and rejects invalid tokens', async () => {
    const invalidSocket = createSocket('bad-token');
    const connectError = await new Promise((resolve) => {
      invalidSocket.on('connect_error', (err) => resolve(err));
    });
    expect(connectError).toBeDefined();
    invalidSocket.disconnect();
  });

  test('delivers message in real time and handles mark_read expiry event', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      participantKey: Conversation.getParticipantKey(userA._id, userB._id),
    });

    socketA = createSocket(tokenA);
    socketB = createSocket(tokenB);

    await Promise.all([
      new Promise((res) => socketA.on('connect', res)),
      new Promise((res) => socketB.on('connect', res)),
    ]);

    // Both join the conversation room
    await new Promise((res) => {
      socketA.emit('join_conversation', { conversationId: conv._id.toString() }, res);
    });
    await new Promise((res) => {
      socketB.emit('join_conversation', { conversationId: conv._id.toString() }, res);
    });

    // Bob listens for new_message
    const messagePromise = new Promise((resolve) => {
      socketB.on('new_message', (msg) => resolve(msg));
    });

    // Alice sends a message
    const sendAck = await new Promise((resolve) => {
      socketA.emit(
        'send_message',
        {
          conversationId: conv._id.toString(),
          text: 'Hello from Socket.IO!',
        },
        resolve
      );
    });

    expect(sendAck.success).toBe(true);
    expect(sendAck.data.text).toBe('Hello from Socket.IO!');
    expect(sendAck.data.readAt).toBeNull();
    expect(sendAck.data.expiresAt).toBeNull();

    const receivedMessage = await messagePromise;
    expect(receivedMessage._id).toBe(sendAck.data._id);

    // Alice listens for message_expiry_started
    const expiryPromise = new Promise((resolve) => {
      socketA.on('message_expiry_started', (payload) => resolve(payload));
    });

    // Bob reads the message
    const markReadAck = await new Promise((resolve) => {
      socketB.emit('mark_read', { conversationId: conv._id.toString() }, resolve);
    });

    expect(markReadAck.success).toBe(true);
    expect(markReadAck.count).toBe(1);

    const expiryPayload = await expiryPromise;
    expect(expiryPayload.conversationId).toBe(conv._id.toString());
    expect(expiryPayload.messageIds).toContain(sendAck.data._id);
    expect(expiryPayload.readAt).toBeDefined();
    expect(expiryPayload.expiresAt).toBeDefined();

    const readAtTime = new Date(expiryPayload.readAt).getTime();
    const expiresAtTime = new Date(expiryPayload.expiresAt).getTime();
    expect(expiresAtTime - readAtTime).toBe(24 * 60 * 60 * 1000);
  });
});
