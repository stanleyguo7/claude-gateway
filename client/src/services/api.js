import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export async function sendMessage(message, sessionId = null) {
  const response = await api.post('/chat/message', {
    message,
    sessionId
  });
  return response.data;
}

export async function getHistory(sessionId) {
  const response = await api.get(`/chat/history/${sessionId}`);
  return response.data;
}

export async function getSessions() {
  const response = await api.get('/chat/sessions');
  return response.data.sessions;
}

export async function createSession(title) {
  const response = await api.post('/chat/sessions', { title });
  return response.data.session;
}

export async function deleteSessionApi(sessionId) {
  const response = await api.delete(`/chat/sessions/${sessionId}`);
  return response.data;
}

export async function renameSession(sessionId, title) {
  const response = await api.patch(`/chat/sessions/${sessionId}`, { title });
  return response.data;
}
