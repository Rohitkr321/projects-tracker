# General Aeronautics Project Tracker

Full-stack internal project and issue tracker for General Aeronautics. The repository contains an Expo React Native frontend for web and Android, plus an Express and MySQL backend API with Socket.io notifications.

## Repository Structure

```text
ga-jira-fe/       Expo React Native app for web and Android
ga-jira-backend/  Express API, Sequelize models, Socket.io, uploads, email
```

## Prerequisites

- Node.js 20 or newer
- npm
- MySQL 8 or compatible
- Expo CLI through `npx expo`

## Quick Start

1. Install backend dependencies:

   ```bash
   cd ga-jira-backend
   npm install
   cp .env.example .env
   ```

2. Update `ga-jira-backend/.env` with your MySQL, JWT, SMTP, upload, and frontend URL values.

3. Start the backend:

   ```bash
   npm run dev
   ```

4. Install frontend dependencies:

   ```bash
   cd ../ga-jira-fe
   npm install
   cp .env.example .env
   ```

5. Start the frontend:

   ```bash
   npm run web
   ```

For Android development, use `npm run android` from `ga-jira-fe`.

## Environment Files

Real `.env` files are intentionally ignored. Commit only `.env.example` files with placeholder values.

## Documentation

- Frontend setup: [ga-jira-fe/README.md](ga-jira-fe/README.md)
- Backend setup: [ga-jira-backend/README.md](ga-jira-backend/README.md)
