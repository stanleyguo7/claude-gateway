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
