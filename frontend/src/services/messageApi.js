import api from './api';

export const fetchConversations = async () => {
  const res = await api.get('/messages/conversations');
  return res.data.data;
};

export const createOrGetConversation = async (userId) => {
  const res = await api.post(`/messages/conversations/${userId}`);
  return res.data.data;
};

export const fetchMessages = async (conversationId, params = {}) => {
  const res = await api.get(`/messages/conversations/${conversationId}`, { params });
  return res.data.data;
};

export const markMessagesAsRead = async (conversationId) => {
  const res = await api.post(`/messages/conversations/${conversationId}/read`);
  return res.data;
};
