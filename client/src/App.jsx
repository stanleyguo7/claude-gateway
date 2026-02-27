import { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from './components/ChatMessage';
import MessageInput from './components/MessageInput';
import { sendMessage } from './services/api';
import wsService from './services/websocket';
import './App.css';

let messageIdCounter = 0;
function nextMessageId() {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const streamingMsgId = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket setup
  useEffect(() => {
    wsService.connect();

    const offConnected = wsService.on('connected', () => {
      setWsConnected(true);
    });

    const offDisconnected = wsService.on('disconnected', () => {
      setWsConnected(false);
    });

    const offStreamStart = wsService.on('stream_start', () => {
      const msgId = nextMessageId();
      streamingMsgId.current = msgId;
      setMessages(prev => [...prev, {
        id: msgId,
        text: '',
        sender: 'assistant',
        timestamp: new Date(),
        isStreaming: true
      }]);
    });

    const offStreamChunk = wsService.on('stream_chunk', (data) => {
      const currentId = streamingMsgId.current;
      if (!currentId) return;
      setMessages(prev => prev.map(msg =>
        msg.id === currentId
          ? { ...msg, text: msg.text + data.chunk }
          : msg
      ));
    });

    const offStreamEnd = wsService.on('stream_end', (data) => {
      const currentId = streamingMsgId.current;
      if (currentId) {
        setMessages(prev => prev.map(msg =>
          msg.id === currentId
            ? { ...msg, text: data.message, isStreaming: false }
            : msg
        ));
      }
      streamingMsgId.current = null;
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      setIsLoading(false);
    });

    const offError = wsService.on('error', (data) => {
      streamingMsgId.current = null;
      setMessages(prev => [...prev, {
        id: nextMessageId(),
        text: data.error || 'An error occurred.',
        sender: 'error',
        timestamp: new Date(),
        isError: true
      }]);
      setIsLoading(false);
    });

    return () => {
      offConnected();
      offDisconnected();
      offStreamStart();
      offStreamChunk();
      offStreamEnd();
      offError();
      wsService.disconnect();
    };
  }, []);

  // Send via WebSocket (streaming)
  const handleSendStreaming = useCallback((text) => {
    const userMessage = {
      id: nextMessageId(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const sent = wsService.sendChat(text, sessionId);
    if (!sent) {
      setMessages(prev => [...prev, {
        id: nextMessageId(),
        text: 'WebSocket not connected. Falling back to REST API...',
        sender: 'error',
        timestamp: new Date(),
        isError: true
      }]);
      setIsLoading(false);
      // Fallback to REST
      handleSendRest(text);
    }
  }, [sessionId]);

  // Send via REST API (non-streaming)
  const handleSendRest = useCallback(async (text) => {
    const userMessage = {
      id: nextMessageId(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(text, sessionId);
      if (!sessionId) {
        setSessionId(response.sessionId);
      }
      setMessages(prev => [...prev, {
        id: nextMessageId(),
        text: response.response.message,
        sender: 'assistant',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: nextMessageId(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'error',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleSendMessage = useCallback((text) => {
    if (useStreaming && wsConnected) {
      handleSendStreaming(text);
    } else {
      handleSendRest(text);
    }
  }, [useStreaming, wsConnected, handleSendStreaming, handleSendRest]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Gateway</h1>
        <div className="header-controls">
          <span className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
          <label className="streaming-toggle">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
            />
            Streaming
          </label>
        </div>
      </header>

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to Claude Gateway</h2>
              <p>Start a conversation with Claude</p>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && !streamingMsgId.current && (
            <div className="loading-indicator">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <MessageInput
          onSend={handleSendMessage}
          disabled={isLoading}
        />
      </main>
    </div>
  );
}

export default App;
