import api from './api';

export const searchUsers = (params) => api.get('/users', { params }).then((r) => r.data.data);
export const getUser = (id) => api.get(`/users/${id}`).then((r) => r.data.data.user);
export const getSuggestions = () => api.get('/users/suggestions').then((r) => r.data.data.users);
export const updateProfile = (payload) => api.patch('/users/me', payload).then((r) => r.data.data.user);
