# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Repository Overview

**Claude Gateway** - A local gateway service that communicates with Claude Code CLI and provides a web-based chat interface.

## Development Workflow

### ⚠️ CRITICAL: Auto-commit Rule

**每次修改代码完成后，必须立即提交代码到 Git！**

This is a mandatory step in the development workflow:

1. After making any code changes
2. Test to ensure the code works
3. Immediately commit and push:
   ```bash
   git add .
   git commit -m "feat/fix/docs: description of changes"
   git push origin main
   ```

Use semantic commit messages:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `refactor:` - Code refactoring
- `style:` - Code formatting
- `test:` - Tests
- `chore:` - Maintenance tasks

### Quick Commit Commands

Available npm scripts for easy committing:

```bash
# Commit with custom message
npm run commit "feat: your message here"
npm run push

# Quick save (for WIP)
npm run save
```

## Project Structure

```
claude-gateway/
├── server/              # Backend (Node.js + Express)
│   ├── src/
│   │   ├── api/        # REST API routes
│   │   ├── services/   # Business logic
│   │   └── index.js    # Entry point
│   └── package.json
│
├── client/             # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── services/   # API client
│   │   └── App.jsx     # Main app
│   └── package.json
│
└── package.json        # Root config
```

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Start development servers (both frontend and backend)
npm run dev

# Start server only
npm run dev:server

# Start client only
npm run dev:client

# Build production
npm run build
```

## Architecture

### Backend (Port 3001)
- Express.js REST API
- WebSocket for real-time updates
- Session management
- Claude Code CLI integration (via child_process)

### Frontend (Port 3000)
- React 18 with Vite
- Modern chat interface
- Real-time message updates
- Axios for API calls

### Communication Flow
```
Web UI (React) ←→ Gateway Server (Express) ←→ Claude Code CLI
```

## Coding Guidelines

### General
- Write clean, readable code
- Add comments for complex logic
- Use ES6+ features (async/await, arrow functions, etc.)
- Follow existing code style

### Backend
- Use Express middleware pattern
- Handle errors properly with try-catch
- Validate input data
- Use async/await for asynchronous operations
- Keep routes thin, move logic to services

### Frontend
- Use functional components with hooks
- Keep components small and focused
- Handle loading and error states
- Use meaningful variable names
- Separate concerns (components, services, styles)

### File Organization
- One component per file
- Co-locate related files (component + CSS)
- Use clear, descriptive file names
- Keep services separate from components

## Testing Workflow

Before committing:
1. Test the feature manually
2. Check for console errors
3. Verify API endpoints work
4. Test both frontend and backend

## Important Files

- `WORKFLOW.md` - Detailed Git workflow
- `SETUP.md` - Installation and setup guide
- `ARCHITECTURE.md` - System architecture documentation
- `.env.example` - Environment variables template

## Environment Variables

Server requires `.env` file:
```
PORT=3001
CLAUDE_CLI_PATH=/usr/local/bin/claude
NODE_ENV=development
```

## Common Tasks

### Adding a new API endpoint
1. Create route in `server/src/api/`
2. Implement logic in `server/src/services/`
3. Register route in `server/src/index.js`
4. Test with Postman or frontend
5. **Commit changes**

### Adding a new React component
1. Create component in `client/src/components/`
2. Create associated CSS file
3. Import and use in parent component
4. Test in browser
5. **Commit changes**

### Modifying Claude CLI integration
1. Edit `server/src/services/claude.js`
2. Test CLI communication
3. Update error handling
4. **Commit changes**

## Git Branches

- `main` - Primary development branch
- Feature branches: `feature/feature-name` (optional)
- Hotfix branches: `hotfix/fix-name` (for urgent fixes)

## Troubleshooting

### Port already in use
- Change PORT in `server/.env`
- Update proxy in `client/vite.config.js`

### Dependencies issues
- Run `npm run install:all`
- Clear node_modules: `rm -rf node_modules && npm install`

### Git issues
- Check status: `git status`
- View logs: `git log --oneline`
- Reset if needed: `git reset --soft HEAD~1`

## Next Development Steps

1. ✅ Basic project structure
2. ✅ Frontend chat UI
3. ✅ Backend API scaffold
4. ⏳ Implement actual Claude CLI integration
5. ⏳ Add message persistence
6. ⏳ Implement WebSocket streaming
7. ⏳ Add file upload support
8. ⏳ Add authentication

## Notes

- Always keep dependencies updated
- Write meaningful commit messages
- Test before pushing
- Document complex logic
- **Remember: Commit after every meaningful change!**
