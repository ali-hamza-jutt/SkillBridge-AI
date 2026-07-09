# SkillBridge AI

SkillBridge AI is a freelance task marketplace connecting clients and freelancers — post a task, receive bids, hire, and collaborate through real-time chat with file sharing and video meetings.

## Project Goal

- Modern backend service design with event-driven patterns.
- A practical task marketplace workflow (client posts task, freelancer bids, client assigns, notification flows).
- Production-style architecture across auth, messaging, media storage, caching, and realtime communication.

## Architecture Highlights

### 1) Microservices (NestJS)
- Event-driven communication between modules/services.
- Decoupled architecture so features evolve independently.

### 2) RabbitMQ
- Asynchronous message handling for task and notification events.
- Better reliability and scalability compared to tightly coupled direct calls.

### 3) Redis
- Caching frequently requested data (unread counts, presence, third-party API tokens).
- Reduced repeated database queries and improved response performance.

## Tech Stack

- Backend: NestJS, TypeScript, Mongoose
- Database: MongoDB
- Messaging: RabbitMQ
- Cache: Redis
- API Docs: Swagger
- Frontend: Next.js (App Router), Redux Toolkit, RTK Query
- Realtime: Socket.IO
- Video meetings: Zoom (Server-to-Server OAuth)

## Features

- User module and user creation flow
- Authentication with JWT
- Task management
	- Create task
	- List tasks
	- Update/Delete task
	- Assign task
- Bidding flow for tasks
- Notification pipeline
	- Event handling via RabbitMQ
	- Notification persistence in MongoDB
	- Realtime delivery via WebSocket
- Real-time chat
	- Text messages, image/video/document attachments
	- Delivered/read receipts
	- Instant and scheduled Zoom video meetings, with double-booking conflict detection
- Redis caching for selected task queries
- Swagger API documentation
- Redux Toolkit + RTK Query integration in frontend

## Video Meetings (Zoom Integration)

Each conversation's chat header has **Start** (instant call) and **Schedule** (book a future call) actions, backed by the Zoom REST API via a Server-to-Server OAuth app.

- Meetings are stored in MongoDB (`server/src/meetings`) with UTC start/end times; a participant's availability is checked with a single indexed overlap query before a new meeting is scheduled, so double-booking is caught and surfaced to the user.
- The Zoom OAuth access token is cached in Redis between calls (`server/src/zoom`).
- Requires a Zoom Server-to-Server OAuth app — see `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` in `server/.env.example`.

## Current Focus

- Stabilize all backend flows end to end
- Improve frontend experience and reusable UI system
- Replace demo/hardcoded flows with full auth-based user mapping where needed

## Future Enhancements

- Complete production-ready auth flow in frontend
- Role-based permissions and guards
- Better error handling and observability
- Automated tests for service and integration layers
- Full Job Board features
- Deployment and CI/CD setup
