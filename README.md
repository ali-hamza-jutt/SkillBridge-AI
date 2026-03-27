# SkillBridge AI

SkillBridge AI is a learning project built to practice real-world backend architecture and improve my developer portfolio.

I completed the initial version in **6 days**, with a strong focus on backend engineering first. The frontend is now being enhanced step by step.

## Project Goal

- Learn modern backend service design with event-driven patterns.
- Build a practical task marketplace workflow (client posts task, freelancer bids, client assigns, notification flows).
- Showcase production-style concepts in a portfolio-ready project.

## Core Modules Practiced

### 1) Microservices (NestJS)
- Event-driven communication between modules/services.
- Decoupled architecture so features evolve independently.

### 2) RabbitMQ
- Asynchronous message handling for task and notification events.
- Better reliability and scalability compared to tightly coupled direct calls.

### 3) Redis
- Caching frequently requested data.
- Reduced repeated database queries and improved response performance.

## Tech Stack

- Backend: NestJS, TypeScript, Mongoose
- Database: MongoDB
- Messaging: RabbitMQ
- Cache: Redis
- API Docs: Swagger
- Frontend: Next.js (App Router), Redux Toolkit, RTK Query
- Realtime: Socket.IO

## Features Implemented (Initial)

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
- Redis caching for selected task queries
- Swagger API documentation
- Basic frontend screens
	- Landing page
	- Login
	- Signup
	- Dashboard shell
- Redux Toolkit + RTK Query integration in frontend

## Development Timeline

- **Duration:** 6 days for initial milestone
- **Phase 1 (Primary):** Backend architecture and core workflows
- **Phase 2 (Ongoing):** Frontend polish, UX improvements, and deeper integrations

## Current Focus

- Stabilize all backend flows end to end
- Improve frontend experience and reusable UI system
- Replace demo/hardcoded flows with full auth-based user mapping where needed

## Future Enhancements

- Complete production-ready auth flow in frontend
- Role-based permissions and guards
- Better error handling and observability
- Automated tests for service and integration layers
- Deployment and CI/CD setup

---

This repository is intentionally built as a learning-first implementation of distributed backend concepts, then incrementally upgraded into a stronger portfolio project.
