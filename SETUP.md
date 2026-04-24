# Stock Analysis Tool — Setup Guide

This document explains how to initialise and run the Stock Analysis Tool locally.

## Prerequisites

| Tool       | Purpose                  |
| ---------- | ------------------------ |
| Python 3.x | Backend runtime          |
| Node.js    | Frontend runtime         |
| npm        | Frontend package manager |
| Git        | Version control          |

You will also need a **Supabase** project. Create one at [supabase.com](https://supabase.com) and note down:

- Project URL (e.g. `https://xxxxx.supabase.co`)
- Service role key (for the backend)
- Anonymous/public key (for the frontend)

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd stock-analysis-tool
```

---

## 2. Backend Setup

### 2.1 Create a virtual environment

```bash
cd backend
python -m venv venv
```

### 2.2 Activate the virtual environment

```bash
# Windows (Git Bash)
source venv/Scripts/activate

# Windows (CMD)
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 2.3 Install dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

### 2.5 Start the backend server

```bash
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000**. You can verify it is running by visiting `http://localhost:8000/health`.

---

## 3. Frontend Setup

Open a **second terminal** and navigate to the frontend directory.

### 3.1 Install dependencies

```bash
cd frontend
npm install
```

### 3.2 Configure environment variables

Create a `frontend/.env` file:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 3.3 Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:5173** with hot module replacement enabled.

---

## 4. Verify Everything Is Working

1. Confirm the backend health check returns a response at `http://localhost:8000/health`.
2. Open `http://localhost:5173` in your browser.
3. Search for a US stock ticker (e.g. AAPL) to confirm data is loading.

---

## 5. Available Scripts

### Backend

| Command                            | Description                          |
| ---------------------------------- | ------------------------------------ |
| `uvicorn app.main:app --reload`    | Start dev server with auto-reload    |

### Frontend

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start Vite dev server              |
| `npm run build`     | Compile TypeScript and build for production |
| `npm run preview`   | Preview the production build       |
| `npm run lint`      | Run ESLint checks                  |

---

## Project Structure

```
stock-analysis-tool/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── models/            # Pydantic data models
│   │   ├── routers/           # API route handlers
│   │   └── services/          # Business logic (yfinance, Supabase)
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                   # Your local config (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Root component
│   │   ├── main.tsx           # React entry point
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level components
│   │   ├── services/          # API client layer
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   ├── package.json
│   └── .env                   # Your local config (not committed)
└── CLAUDE.md
```

---

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| CORS errors in the browser | Make sure the backend is running on port 8000 and the frontend on port 5173. The backend is configured to allow requests from `http://localhost:5173`. |
| `ModuleNotFoundError` in Python | Ensure your virtual environment is activated and dependencies are installed with `pip install -r requirements.txt`. |
| Frontend cannot reach the API | Verify the backend is running and accessible at `http://localhost:8000/health`. |
| Supabase connection errors | Double-check that your `.env` files contain the correct Supabase URL and keys. |
