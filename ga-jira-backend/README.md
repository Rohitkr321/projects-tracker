# GA Tracker Backend

Express API for the General Aeronautics project tracker. It provides authentication, invites, users, projects, issues, comments, time logs, sprints, boards, workflows, custom fields, reports, notifications, webhooks, uploads, and Socket.io events.

## Stack

- Node.js and Express
- MySQL with Sequelize
- JWT access and refresh tokens
- Socket.io
- Multer uploads
- Nodemailer SMTP email
- Helmet, CORS, compression, rate limiting, and Morgan logging

## Setup

```bash
npm install
cp .env.example .env
```

Create a MySQL database matching `DB_NAME`, then update `.env` with local values.

## Environment

Important variables:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ga_jira
DB_USER=root
DB_PASSWORD=root
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=replace-with-smtp-user
SMTP_PASS=replace-with-smtp-password
EMAIL_FROM=no-reply@example.com
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
FRONTEND_URL=http://localhost:8081
APP_NAME=GA Tracker
ORG_NAME=General Aeronautics
```

Do not commit real `.env` files.

## Scripts

```bash
npm start   # Start API
npm run dev # Start API with nodemon
npm run db:sync # Recreate schema with sequelize.sync({ force: true })
node seed.js # Seed sample organization and users
```

## API

Base URL: `http://localhost:5000/api/v1`

Core routes:

```text
/auth
/invites
/users
/projects
/issues
/notifications
/search
/sprints
/reports
/projects/:projectId/sprints
/projects/:projectId/epics
/projects/:projectId/workflows
/projects/:projectId/boards
/projects/:projectId/milestones
/projects/:projectId/releases
/projects/:projectId/documents
/projects/:projectId/custom-fields
/projects/:projectId/webhooks
```

Health check:

```bash
curl http://localhost:5000/health
```

## Runtime Data

Uploaded files are stored in `uploads/` during local development. The folder is kept in git with `.gitkeep`, but uploaded files are ignored.
