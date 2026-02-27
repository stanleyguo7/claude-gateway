# Claude Gateway

A local gateway service that communicates with Claude Code CLI and provides a web-based chat interface.

## Project Structure

```
claude-gateway/
├── server/          # Backend gateway server
│   ├── src/
│   │   ├── api/     # API routes
│   │   ├── services/ # Business logic
│   │   └── index.js # Entry point
│   └── package.json
├── client/          # Frontend web interface
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Features

- 🔌 Gateway service for Claude Code CLI integration
- 💬 Web-based chat interface
- 🔄 Real-time message streaming
- 📝 Session management
- 🎨 Modern, responsive UI

## Development

### Server

```bash
cd server
npm install
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

## Architecture

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Communication**: RESTful API + WebSocket (for real-time updates)

## Getting Started

1. Clone the repository
2. Install dependencies for both server and client
3. Configure environment variables
4. Start the development servers

## Development Workflow

**⚠️ Important: 每次修改代码完成后，立即提交到 Git！**

```bash
git add .
git commit -m "feat: description of your changes"
git push origin main
```

详细信息请查看 [WORKFLOW.md](./WORKFLOW.md)

## License

MIT
