# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed (optional, for full functionality)

## Installation

### Option 1: Install all dependencies at once

```bash
npm run install:all
```

### Option 2: Install separately

```bash
# Root dependencies
npm install

# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

## Configuration

1. Create environment file for the server:

```bash
cd server
cp .env.example .env
```

2. Edit `.env` and configure your settings:

```
PORT=3001
CLAUDE_CLI_PATH=/usr/local/bin/claude
NODE_ENV=development
```

## Running the Application

### Development Mode

Run both server and client concurrently:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Client
npm run dev:client
```

### Access the Application

- **Client (Web UI)**: http://localhost:3000
- **Server API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Project Structure

```
claude-gateway/
├── server/              # Backend Express server
│   ├── src/
│   │   ├── api/        # API routes
│   │   │   └── chat.js # Chat endpoints
│   │   ├── services/   # Business logic
│   │   │   ├── claude.js    # Claude CLI integration
│   │   │   └── websocket.js # WebSocket handling
│   │   └── index.js    # Server entry point
│   └── package.json
│
├── client/             # Frontend React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx
│   │   │   └── MessageInput.jsx
│   │   ├── services/
│   │   │   └── api.js  # API client
│   │   ├── App.jsx     # Main component
│   │   └── main.jsx    # Entry point
│   └── package.json
│
└── package.json        # Root package.json
```

## API Endpoints

### REST API

- `POST /api/chat/message` - Send a message to Claude
  - Body: `{ "message": "string", "sessionId": "string" }`
  - Response: `{ "response": {...}, "sessionId": "string" }`

- `GET /api/chat/history/:sessionId` - Get chat history
  - Response: `{ "messages": [...] }`

- `GET /health` - Health check endpoint
  - Response: `{ "status": "ok", "timestamp": "..." }`

### WebSocket

- `ws://localhost:3001` - WebSocket connection for real-time updates

## Next Steps

1. Implement actual Claude Code CLI integration in `server/src/services/claude.js`
2. Add session persistence (database or file storage)
3. Implement message history retrieval
4. Add authentication if needed
5. Add file upload support
6. Implement streaming responses

## Troubleshooting

- If port 3000 or 3001 is already in use, update the ports in:
  - `client/vite.config.js` (client port and proxy)
  - `server/.env` (server port)

- For CORS issues, check the CORS configuration in `server/src/index.js`

## Development Tips

- The server uses nodemon for auto-reload on changes
- The client uses Vite's HMR (Hot Module Replacement)
- Check browser console and terminal for error messages
- Use browser DevTools Network tab to debug API calls

## Development Workflow

**Important: 每次修改代码完成后，必须立即提交代码！**

```bash
# 修改代码后
git add .
git commit -m "feat: your change description"
git push origin main
```

详细的 Git 工作流程请查看 [WORKFLOW.md](./WORKFLOW.md)
