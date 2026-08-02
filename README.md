# 📊 Q&A Data Analysis Agent

This project runs as a split application:
- a FastAPI backend that exposes dataset upload, question answering, history, and health endpoints
- a React + Tailwind frontend that provides the user interface for dataset selection, chat-style question entry, and result rendering

The core analysis pipeline remains grounded in real pandas execution inside a sandboxed Python environment, so answers are computed from the uploaded dataset rather than guessed by the model.

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- A Groq API key in the environment or in a local .env file

### 2. Configure environment
Create or update `.env` with your Groq key:

```env
GROQ_API_KEY=your_key_here
```

### 3. Install dependencies

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd frontend
npm install
```

### 4. Run the app

Option A: Start both services manually

```bash
# backend
uvicorn api:app --host 0.0.0.0 --port 8000

# frontend (separate terminal)
cd frontend
npm run dev -- --host 0.0.0.0 --port 5174
```

Option B: Use the Windows launcher

```bat
run.bat
```

The React UI should open at http://localhost:5174 and call the FastAPI backend at http://localhost:8000.

## 🧠 Architecture

- Backend: [api.py](api.py) and [src/analysis_service.py](src/analysis_service.py)
- Core agent pipeline: [src/agent.py](src/agent.py), [src/sandbox.py](src/sandbox.py), [src/code_generator.py](src/code_generator.py)
- Frontend: [frontend/src](frontend/src)

The API exposes:
- POST /upload
- POST /query
- GET /history
- GET /health
- GET /datasets and GET /datasets/{dataset_id}

## 🔒 Security & persistence
- Sandbox validation remains in [src/sandbox.py](src/sandbox.py)
- SQLite logging continues through [src/db.py](src/db.py)
- Secrets stay in `.env` and are ignored by git via [.gitignore](.gitignore)

## ✅ Verification
Run the regression suite:

```bash
python -m unittest discover -s tests
```

Build the frontend:

```bash
cd frontend
npm run build
```
