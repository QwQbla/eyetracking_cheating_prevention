# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an eye-tracking interview platform built with React + Vite that enables remote technical interviews with cheating prevention through WebGazer eye-tracking technology. The application uses WebRTC for peer-to-peer video/data communication and Socket.IO for signaling.

**Key Technologies:**
- Frontend: React 19, Vite, React Router
- Real-time Communication: WebRTC, Socket.IO
- Eye Tracking: WebGazer.js
- Code Editor: CodeMirror (via @uiw/react-codemirror)
- Styling: Bootstrap, CSS Modules

## Development Commands

### Start Development Environment
```bash
npm run dev
```
This starts both the Vite dev server (client) and the Socket.IO signaling server concurrently.

### Individual Services
```bash
npm run client  # Start Vite dev server only (port 5173)
npm run server  # Start signaling server only (port 8080)
```

### Build & Preview
```bash
npm run build   # Build for production
npm run preview # Preview production build
```

### Code Quality
```bash
npm run lint     # Run ESLint on all files
npm run lint:css # Run Stylelint and auto-fix CSS/SCSS files
```

## Architecture

### Dual Role System

The application supports two roles with distinct workflows:

**Interviewer (面试官):**
- Creates interview sessions with roomId
- Initiates WebRTC connection (creates offer)
- Publishes interview questions
- Receives real-time eye-tracking data via DataChannel
- Views candidate's gaze visualization overlaid on their video

**Interviewee (应聘者):**
- Joins sessions via roomId
- Goes through camera calibration flow before interview
- Responds to WebRTC offer with answer
- Sends eye-tracking data via P2P DataChannel + backend buffering
- All interview pages wrapped in `WebgazerProvider` context

### Core Communication Flow

1. **Signaling (Socket.IO - port 8080):**
   - Room management (`join-room`)
   - WebRTC signaling (`offer`, `answer`, `ice-candidate`)
   - Application-level sync (`code-update`, `question-update`, `status-update`, `code-result`)

2. **P2P Data (WebRTC DataChannel):**
   - Real-time eye-tracking coordinates from interviewee → interviewer
   - Low latency, direct peer communication

3. **Backend API (port 80):**
   - Authentication endpoints (login, captcha)
   - Task/interview management
   - Eye-tracking data persistence (`/api/static-json/save`)
   - Base URL: `http://8.148.191.101:80`

### Key Contexts & Hooks

**WebgazerProvider (`src/contexts/WebgazerProvider.jsx`):**
- Manages WebGazer lifecycle (initialization, shutdown)
- Shares camera stream across calibration and interview pages
- Must wrap interviewee routes that use eye-tracking
- Provides: `stream`, `status`, `initializeWebgazer()`, `shutdownWebgazer()`

**useWebgazer Hook (`src/hooks/useWebgazer.js`):**
- Consumes WebgazerContext
- Used in calibration and interview pages

### Page Structure

```
src/pages/
├── LoginPage.jsx              # Entry point with role selection
├── InterviewerHomePage.jsx    # Dashboard for creating sessions
├── IntervieweeHomePage.jsx    # Dashboard for joining sessions
├── InterviewerProfile.jsx     # Profile management
├── IntervieweeProfile.jsx     # Profile management
├── CameraCalibrationPage.jsx # 9-point calibration (wrapped in WebgazerProvider)
├── InterviewerContent.jsx    # Main interview UI (no eye-tracking)
└── IntervieweeContent.jsx    # Main interview UI (with eye-tracking, wrapped in WebgazerProvider)
```

### Component Architecture

**SharedCodeEditor (`src/components/SharedCodeEditor.jsx`):**
- Real-time collaborative code editor using CodeMirror
- Syncs via Socket.IO (`code-update` events)
- Uses sessionStorage for persistence: `interview_code_${roomId}`

**Code Execution:**
- Runs in Web Worker (`public/coderunner.js`)
- Intercepts console.log for output capture
- Results broadcast via Socket.IO to both parties

### State Persistence

The application uses sessionStorage with roomId-scoped keys:
- `interview_code_${roomId}` - Shared code editor content
- `interview_question_${roomId}` - Interview question text

### Eye-Tracking Data Flow

**Interviewee Side:**
1. WebGazer captures gaze coordinates
2. Data buffered locally for 5-second backend upload
3. Simultaneously sent via DataChannel for real-time display

**Interviewer Side:**
- Receives gaze data from DataChannel
- Updates overlay position in real-time
- Visual indicator shows where candidate is looking

## Development Notes

### API Configuration

Edit `src/api.js` to change backend endpoints:
- `BASE_URL`: Production backend (currently `http://8.148.191.101:80`)
- `BASE_URL1`: Local development backend (currently `http://localhost:5000/api`)

Vite proxy config in `vite.config.js` handles `/api` path rewrites.

### WebRTC Configuration

Uses Google STUN server by default:
```javascript
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};
```

For production, consider adding TURN servers for NAT traversal.

### Cleanup Pattern

Both interviewer and interviewee pages implement thorough cleanup on unmount:
- Stop media streams
- Close PeerConnection and DataChannel
- Disconnect Socket.IO
- Terminate Web Workers
- Clear sessionStorage
- Shutdown WebGazer (interviewee only)

Always test navigation/exit scenarios to prevent resource leaks.

### ESLint Configuration

Uses flat config format (`eslint.config.js`):
- React Hooks rules enforced
- Ignores unused vars matching pattern `^[A-Z_]`
- `dist/` directory excluded

### Styling Approach

- Global styles: Bootstrap 5
- Page-specific: CSS files in `src/styles/`
- Shared layout: CSS Modules (`SharedLayout.module.css`)

## Common Development Patterns

### Adding New Socket.IO Events

1. Add event name to `forwardEvents` array in `server/signaling-server.js`
2. Emit from sender: `socketRef.current.emit('event-name', data)`
3. Listen in receiver: `socket.on('event-name', (data) => { ... })`

### Extending Eye-Tracking Features

All eye-tracking logic must run within routes wrapped by `<GazeTrackingLayout>` (see `App.jsx`). The WebgazerProvider handles camera permissions and stream management.

### Adding API Endpoints

1. Define endpoint in `src/api.js` under `API_ENDPOINTS`
2. Use fetch with proper headers (include auth token if needed)
3. Handle CORS via Vite proxy or backend configuration
