# FinWise AI — System Architecture & Design

FinWise AI is built on a modular, decoupled full-stack architecture designed for high maintainability, security, and scalability.

---

## 1. Top-Level Overview

```
                      +-----------------------------+
                      |    React + TypeScript UI    |
                      |   (Vite, Tailwind, Recharts)|
                      +--------------+--------------+
                                     |
                                     | REST API (JWT Authenticated)
                                     v
                      +-----------------------------+
                      |      Flask REST API Core    |
                      +--------------+--------------+
                                     |
    +-------------------+------------+------------+--------------------+
    |                   |                         |                    |
    v                   v                         v                    v
+-------+      +------------------+     +------------------+  +------------------+
|  DB   |      | Recommendation   |     |    AI Service    |  |  Tesseract OCR   |
|Postgres|     |     Engine       |     | (Gemini/Ollama)  |  |  & Voice Parser  |
+-------+      +------------------+     +------------------+  +------------------+
```

---

## 2. Component Layers

### Frontend (React + TypeScript)
- **Framework**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS + Lucide Icons.
- **Charts**: Recharts for dynamic visual financial breakdown.
- **State Management**: React Context (`AuthContext`) for user sessions and JWT persistence.

### Backend (Python + Flask)
- **Framework**: Flask REST API with Blueprint architecture.
- **Authentication**: JWT authentication with `flask-jwt-extended` and password hashing with `werkzeug.security` (BCrypt).
- **ORM**: SQLAlchemy ORM with PostgreSQL database storage.
- **Services**:
  - `recommendation_service.py`: Explainable investment rules engine.
  - `ai_service.py`: Provider abstraction layer (`GeminiProvider`, `OllamaProvider`, `OpenAIProvider`, `HeuristicProvider`).
  - `health_service.py`: Financial Health Score (0-100) engine.
  - `notification_service.py`: Real-time budget, bill, and savings alert generator.
  - `achievement_service.py`: Gamification system tracking badges and achievements.

---

## 3. Data Flow
1. **User Request**: React frontend sends an HTTP request with `Authorization: Bearer <token>`.
2. **Authentication Middleware**: Flask JWT verifies token integrity and extracts `user_id`.
3. **Service Logic**: Route delegates heavy logic to dedicated services.
4. **AI & ML Integration**: AI calls minimal financial context through `AIProvider` abstractions.
5. **Response**: Flask returns structured JSON response to React components.
