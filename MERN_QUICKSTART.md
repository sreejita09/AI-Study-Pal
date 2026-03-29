# AI Study Pal MERN Quickstart

This workspace now contains a new MERN version of the app:

- `frontend/` - React + Vite + Tailwind
- `backend/` - Express + MongoDB + JWT auth

## 1. Backend setup

Create a file at `backend/.env` using `backend/.env.example`.

Required values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ai-study-pal
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
COOKIE_NAME=aistudypal_token
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=AI Study Pal <noreply@aistudypal.dev>
```

If SMTP values are empty, verification emails will be logged to the terminal instead.

## 2. Frontend setup

Create a file at `frontend/.env` using `frontend/.env.example`.

```env
VITE_API_URL=http://localhost:5000/api
```

## 3. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 4. Run locally

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## 5. Local links

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Health: `http://localhost:5000/api/health`

## 6. Main features already wired

- Register with password rules and strength meter
- Email verification route
- Verified-only login
- JWT auth via secure httpOnly cookie
- Protected dashboard route
- File upload for PDF and TXT
- AI summary, quiz, and notes panels
- Learning-engine scaffolding for spaced repetition, difficulty scaling, and topic tracking
- Rate limiting, validation, and error middleware

## 7. Next production upgrades

- Redis for caching
- BullMQ for background jobs
- Vector search for semantic retrieval
- Role-based access control
- Analytics admin dashboard
