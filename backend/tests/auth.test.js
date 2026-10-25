process.env.JWT_SECRET = 'test_secret';
process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongod;
const student = { name: 'Asha Rao', email: 'Asha@Example.com', password: 'Passw0rdX', college: 'ABC College', course: 'B.Tech CSE', year: 2 };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init(); // build unique index
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => { await User.deleteMany({}); });

const register = (body = student) => request(app).post('/api/auth/register').send(body);

describe('Registration', () => {
  test('creates a user, hashes password, returns token', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
    const stored = await User.findOne({ email: 'asha@example.com' }).select('+password');
    expect(stored.password).not.toBe(student.password);
  });
  test('rejects duplicate email (case-insensitive)', async () => {
    await register();
    const res = await register({ ...student, email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
  });
  test('rejects weak password and missing fields', async () => {
    expect((await register({ ...student, password: 'short' })).status).toBe(422);
    expect((await register({ email: 'x@y.com' })).status).toBe(422);
  });
});

describe('Login and protected routes', () => {
  test('logs in with correct credentials', async () => {
    await register();
    const res = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: student.password });
    expect(res.status).toBe(200);
  });
  test('rejects wrong password with generic message', async () => {
    await register();
    const res = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'wrongpass1' });
    expect(res.status).toBe(401);
  });
  test('blocks /me and /users without token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/users')).status).toBe(401);
  });
  test('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });
});

describe('Profiles', () => {
  test('updates own profile but cannot change email', async () => {
    const { body } = await register();
    const auth = { Authorization: `Bearer ${body.data.token}` };
    const res = await request(app).patch('/api/users/me').set(auth)
      .send({ bio: 'Hello', skills: ['React', ' React ', 'Node'], email: 'hacker@x.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.skills).toEqual(['React', 'Node']);
    expect(res.body.data.user.email).toBe('asha@example.com');
  });
  test('searches students by skill', async () => {
    const { body } = await register();
    await User.create({ ...student, email: 'b@example.com', name: 'Ben', skills: ['Docker'] });
    const res = await request(app).get('/api/users?q=docker').set('Authorization', `Bearer ${body.data.token}`);
    expect(res.body.data.users).toHaveLength(1);
  });
  test('invalid id returns 400', async () => {
    const { body } = await register();
    const res = await request(app).get('/api/users/abc').set('Authorization', `Bearer ${body.data.token}`);
    expect(res.status).toBe(400);
  });
});
