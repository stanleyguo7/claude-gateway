import { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from './components/ChatMessage';
import MessageInput from './components/MessageInput';
import SessionSidebar from './components/SessionSidebar';
import { sendMessage, getSessions, createSession, deleteSessionApi, renameSession, getHistory } from './services/api';
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
  const [sessions, setSessions] = useState([]);
  const [useStreaming, setUseStreaming] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const streamingMsgId = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  // Load messages when session changes
  const loadSessionMessages = useCallback(async (sid) => {
    if (!sid) {
      setMessages([]);
      return;
    }
    try {
      const data = await getHistory(sid);
      setMessages(
        data.messages.map((msg) => ({
          id: nextMessageId(),
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'assistant',
          timestamp: new Date(msg.timestamp)
        }))
      );
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setMessages([]);
    }
  }, []);

  const handleSelectSession = useCallback((sid) => {
    setSessionId(sid);
    loadSessionMessages(sid);
    setSidebarOpen(false);
  }, [loadSessionMessages]);

  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession('New Chat');
      setSessions(prev => [session, ...prev]);
      setSessionId(session.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, []);

  const handleDeleteSession = useCallback(async (sid) => {
    try {
      await deleteSessionApi(sid);
      setSessions(prev => prev.filter(s => s.id !== sid));
      if (sessionId === sid) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [sessionId]);

  const handleRenameSession = useCallback(async (sid, title) => {
    try {
      await renameSession(sid, title);
      setSessions(prev =>
        prev.map(s => (s.id === sid ? { ...s, title } : s))
      );
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  }, []);

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
        // Refresh session list to pick up new session
        loadSessions();
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

  // Build message text with file context
  const buildMessageWithFiles = (text, files) => {
    if (!files || files.length === 0) return text;
    const fileNames = files.map(f => f.originalName).join(', ');
    const filesParam = files.map(f => f.filename);
    return { text: text || `Please analyze the attached file(s): ${fileNames}`, files: filesParam, displayText: text || `[Attached: ${fileNames}]` };
  };

  // Send via WebSocket (streaming)
  const handleSendStreaming = useCallback((text, files) => {
    const msgInfo = buildMessageWithFiles(text, files);
    const displayText = typeof msgInfo === 'string' ? msgInfo : msgInfo.displayText;
    const messageText = typeof msgInfo === 'string' ? msgInfo : msgInfo.text;
    const fileNames = typeof msgInfo === 'string' ? undefined : msgInfo.files;

    const userMessage = {
      id: nextMessageId(),
      text: displayText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const sent = wsService.send({
      type: 'chat',
      message: messageText,
      sessionId,
      files: fileNames
    });
    if (!sent) {
      setMessages(prev => [...prev, {
        id: nextMessageId(),
        text: 'WebSocket not connected. Falling back to REST API...',
        sender: 'error',
        timestamp: new Date(),
        isError: true
      }]);
      setIsLoading(false);
      handleSendRest(text, files);
    }
  }, [sessionId]);

  // Send via REST API (non-streaming)
  const handleSendRest = useCallback(async (text, files) => {
    const msgInfo = buildMessageWithFiles(text, files);
    const displayText = typeof msgInfo === 'string' ? msgInfo : msgInfo.displayText;
    const messageText = typeof msgInfo === 'string' ? msgInfo : msgInfo.text;

    const userMessage = {
      id: nextMessageId(),
      text: displayText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(messageText, sessionId);
      if (!sessionId) {
        setSessionId(response.sessionId);
        loadSessions();
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

  const handleSendMessage = useCallback((text, files) => {
    if (useStreaming && wsConnected) {
      handleSendStreaming(text, files);
    } else {
      handleSendRest(text, files);
    }
  }, [useStreaming, wsConnected, handleSendStreaming, handleSendRest]);

  return (
    <div className="app">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <header className="app-header">
        <div className="header-left">
          <h1>Claude Gateway</h1>
        </div>
        <div className="header-controls">
          {sessionId && (
            <div className="export-dropdown">
              <button className="export-btn" title="Export chat">
                &#8615; Export
              </button>
              <div className="export-menu">
                <a href={`/api/chat/export/${sessionId}?format=md`} download>
                  Markdown (.md)
                </a>
                <a href={`/api/chat/export/${sessionId}?format=json`} download>
                  JSON (.json)
                </a>
              </div>
            </div>
          )}
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
