# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Claude Gateway                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│   Web UI     │◄───────►│   Gateway    │◄───────►│  Claude Code │
│  (React)     │  HTTP   │   Server     │  stdio  │     CLI      │
│              │  WS     │  (Express)   │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
   Port 3000                Port 3001
```

## Component Details

### 1. Web UI (Client)

**Technology**: React + Vite

**Responsibilities**:
- Render chat interface
- Handle user input
- Display messages
- Manage client-side state
- WebSocket connection for real-time updates

**Key Components**:
- `App.jsx` - Main application container
- `ChatMessage.jsx` - Individual message display
- `MessageInput.jsx` - Message input field
- `api.js` - API client service

### 2. Gateway Server

**Technology**: Node.js + Express

**Responsibilities**:
- Expose REST API for chat operations
- Manage WebSocket connections
- Handle sessions and message history
- Interface with Claude Code CLI
- Process stdin/stdout communication

**Key Modules**:
- `index.js` - Server setup and middleware
- `api/chat.js` - Chat API routes
- `services/claude.js` - Claude CLI integration
- `services/websocket.js` - WebSocket handling

### 3. Claude Code CLI

**Integration Method**: Process spawning with stdio communication

**Communication Flow**:
1. Server spawns Claude CLI process
2. Sends user messages via stdin
3. Receives responses via stdout
4. Parses and formats responses
5. Returns to client

## Data Flow

### Message Flow

```
1. User types message in Web UI
   │
   ▼
2. Client sends POST /api/chat/message
   │
   ▼
3. Server receives request
   │
   ▼
4. Server spawns/uses Claude CLI process
   │
   ▼
5. Server sends message via stdin
   │
   ▼
6. Claude CLI processes message
   │
   ▼
7. Server receives response via stdout
   │
   ▼
8. Server sends response to client
   │
   ▼
9. Client displays response in UI
```

### Session Management

```
┌─────────────────────────────────────────┐
│          Session Management             │
├─────────────────────────────────────────┤
│                                         │
│  sessionId (UUID)                       │
│    │                                    │
│    ├─ messages: []                     │
│    ├─ createdAt: timestamp             │
│    ├─ lastActivity: timestamp          │
│    └─ claudeProcess: Process           │
│                                         │
└─────────────────────────────────────────┘
```

## API Specification

### REST Endpoints

#### POST /api/chat/message
Send a message to Claude

**Request**:
```json
{
  "message": "Hello Claude",
  "sessionId": "optional-uuid"
}
```

**Response**:
```json
{
  "response": {
    "sessionId": "uuid",
    "message": "Hello! How can I help?",
    "timestamp": "2026-02-27T..."
  },
  "sessionId": "uuid"
}
```

#### GET /api/chat/history/:sessionId
Retrieve chat history for a session

**Response**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "..."
    },
    {
      "role": "assistant",
      "content": "Hi there!",
      "timestamp": "..."
    }
  ]
}
```

#### GET /health
Health check endpoint

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-27T..."
}
```

### WebSocket Events

#### Client → Server

```json
{
  "type": "message",
  "data": {
    "message": "Hello",
    "sessionId": "uuid"
  }
}
```

#### Server → Client

```json
{
  "type": "response",
  "data": {
    "message": "Hello!",
    "sessionId": "uuid",
    "timestamp": "..."
  }
}
```

## Security Considerations

1. **Input Validation**: Sanitize all user input before processing
2. **Session Management**: Implement session timeout and cleanup
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **CORS**: Configure CORS properly for production
5. **Environment Variables**: Never commit sensitive data

## Future Enhancements

### Phase 1: Core Functionality
- [x] Basic chat interface
- [x] Message sending/receiving
- [x] Session management
- [ ] Actual Claude CLI integration
- [ ] Message history persistence

### Phase 2: Enhanced Features
- [ ] File upload support
- [ ] Code syntax highlighting
- [ ] Markdown rendering
- [ ] Export chat history
- [ ] Multi-session support

### Phase 3: Advanced Features
- [ ] Streaming responses
- [ ] Context management
- [ ] Tool usage visualization
- [ ] Authentication system
- [ ] User preferences

### Phase 4: Production Ready
- [ ] Docker containerization
- [ ] Logging and monitoring
- [ ] Error handling and recovery
- [ ] Performance optimization
- [ ] Comprehensive testing

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **WebSocket**: ws
- **Process Management**: child_process

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Styling**: CSS3 (no framework)

### Development Tools
- **Hot Reload**: nodemon (server), Vite HMR (client)
- **Package Manager**: npm
- **Version Control**: Git

## Performance Considerations

1. **WebSocket**: Use for real-time updates to reduce polling
2. **Session Cleanup**: Implement timeout for inactive sessions
3. **Process Pool**: Reuse Claude CLI processes when possible
4. **Caching**: Cache responses for identical queries
5. **Compression**: Enable gzip compression for HTTP responses

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Environment Variables
- `PORT`: Server port (default: 3001)
- `CLAUDE_CLI_PATH`: Path to Claude CLI binary
- `NODE_ENV`: Environment (development/production)
