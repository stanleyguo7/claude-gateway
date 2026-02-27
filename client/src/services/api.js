import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export async function sendMessage(message, sessionId = null) {
  const response = await axios.post(`${API_BASE_URL}/chat/message`, {
    message,
    sessionId
  });
  return response.data;
}

export async function getHistory(sessionId) {
  const response = await axios.get(`${API_BASE_URL}/chat/history/${sessionId}`);
  return response.data;
}
