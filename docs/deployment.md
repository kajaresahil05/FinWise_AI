# FinWise AI — Deployment & Docker Setup Guide

This document provides complete instructions for building, running, and deploying FinWise AI locally or in containerized environments.

---

## 1. Multi-Container Docker Architecture (`docker-compose.yml`)

The application is orchestrated into 3 container services:
1. **`db`**: PostgreSQL 15 container (persisted on volume `postgres_data`).
2. **`backend`**: Python 3.11 Flask API container listening on port `5000`.
3. **`frontend`**: Node 20 / Vite React container listening on port `5173`.

```
[ Browser Client (http://localhost:5173) ]
                    │
                    ▼
   [ Docker Container: finwise_frontend ]
                    │
     REST API       ▼ (http://localhost:5000/api)
   [ Docker Container: finwise_backend ]
                    │
   SQL Connection   ▼ (postgresql://db:5432)
   [ Docker Container: finwise_db ]
```

---

## 2. Launching with Docker Compose

### Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).

### Step 1: Copy Environment Variables
Ensure `.env` exists in your root workspace directory:
```bash
cp .env.example .env
```

### Step 2: Build & Start Containers
Run the following command from the root project directory:
```bash
docker-compose up --build
```

### Step 3: Access the Application
- **Frontend App**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API Health**: Open [http://localhost:5000/api/health](http://localhost:5000/api/health).

---

## 3. Local Development (Without Docker)

### Backend Setup:
```powershell
cd backend
# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python run.py
```

### Frontend Setup:
```powershell
cd frontend
# Install packages
npm install

# Start Vite dev server
npm run dev
```

---

## 4. Connecting Local Ollama for AI (Optional)
To use local offline AI models via Ollama:
1. Install [Ollama](https://ollama.com/) on your host machine.
2. Pull your model of choice:
   ```bash
   ollama pull gemma2:2b
   ```
3. Set environment variables in `.env`:
   ```env
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   ```
4. Restart containers:
   ```bash
   docker-compose restart backend
   ```
