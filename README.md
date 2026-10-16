<p align="center">
  <img src="https://img.shields.io/badge/FinWise_AI-Personal_Finance_%26_Investment_Platform-0ea5e9?style=for-the-badge&labelColor=0f172a" alt="FinWise AI" />
</p>

<h1 align="center">💰 FinWise AI</h1>

<p align="center">
  <strong>Track Smart · Save Better · Invest Wisely</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white" alt="Flask" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat" alt="License" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [AI Engine](#-ai-engine)
- [Setup & Installation](#-setup--installation)
  - [Docker Compose (Recommended)](#option-1-docker-compose-recommended)
  - [Local Development](#option-2-local-development-without-docker)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Security](#-security)
- [Documentation](#-documentation)
- [License](#-license)
- [Disclaimer](#-disclaimer)

---

## 🧭 Overview

**FinWise AI** is a production-quality, full-stack personal finance and investment guidance platform powered by **explainable AI**. It provides users with data-driven financial coaching, intelligent expense categorization, dynamic budget tracking, and personalized investment recommendations — all through a modern, responsive React UI backed by a robust Flask REST API and PostgreSQL database.

The platform is designed with **privacy-first principles**, **multi-provider AI support**, and a modular architecture that makes it easy to extend, deploy, and scale.

---

## ✨ Key Features

### 💸 Core Finance Management
| Feature | Description |
|---|---|
| **Expense & Income Tracking** | Full CRUD with smart categorization, filtering by date/category/merchant, and payment method tracking |
| **AI Expense Categorization** | Natural language text → automatic category/subcategory/merchant extraction using AI or rule-based heuristics |
| **Receipt Scanner (OCR)** | Upload receipt images → Tesseract OCR extracts line items, totals, and merchant details automatically |
| **Voice Expense Entry** | Speak naturally (e.g., *"Spent 450 on groceries at DMart"*) → parsed into structured transaction fields |
| **Budget Management** | Category-level budgets with dual warning thresholds (70% and 90%) and real-time spending progress |
| **Financial Goals** | Set savings targets with deadlines, track current progress, and monitor goal completion |

### 🤖 AI-Powered Intelligence
| Feature | Description |
|---|---|
| **AI Budget Coach** | Conversational AI financial advisor with persistent chat history — provides actionable spending advice |
| **Financial Health Score** | Dynamic 0–100 composite score measuring savings efficiency, budget adherence, emergency fund status, goal progress, and debt health |
| **AI Financial Reports** | Auto-generated monthly financial summary reports with AI-driven insights |
| **Human Feedback Loop** | User corrections to AI categorizations are stored and prioritized in future predictions (self-improving) |

### 📈 Investment & Market Intelligence
| Feature | Description |
|---|---|
| **Live Market Data** | Real-time stock prices, indices, and mutual fund NAVs via external market APIs |
| **Stock Analysis** | Fundamental scoring (ROE, P/E, debt-to-equity, profit growth) with Buy/Hold/Sell signals |
| **Mutual Fund Analysis** | Fund scoring based on CAGR, expense ratio, AUM, and risk-adjusted returns |
| **Risk Assessment** | Interactive questionnaire → personalized risk profile (Conservative / Moderate / Aggressive) |
| **Explainable Recommendations** | 2-stage pipeline: deterministic asset allocation engine → LLM-generated beginner-friendly explanations |
| **Investment Simulator** | Compound interest, SIP, Lump Sum, and What-If scenario planning tools |
| **Portfolio Management** | Manual asset tracking (Stocks, Mutual Funds, ETFs) with allocation breakdown and health checks |

### 🎯 Engagement & Notifications
| Feature | Description |
|---|---|
| **Smart Notifications** | Auto-generated alerts for budget overruns, goal deadlines, savings reminders, and spending anomalies |
| **Gamification & Achievements** | Unlock badges and trophies for financial milestones (first budget, savings streak, etc.) |

---

## 🏗 Architecture

FinWise AI follows a **decoupled, service-oriented full-stack architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│         React 19 · TypeScript · Tailwind CSS · Recharts     │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST API (JSON)
                           │  Authorization: Bearer <JWT>
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  FLASK REST API (Python)                     │
│       Blueprint Routes · JWT Auth · SQLAlchemy ORM          │
├────────────┬────────────┬────────────┬──────────────────────┤
│ Recommend  │ AI Service │  Health    │  OCR / Voice         │
│ Engine     │ (Multi-    │  Score     │  Parser              │
│ (Rules +   │  Provider) │  Engine    │  (Tesseract)         │
│  Scoring)  │            │            │                      │
└─────┬──────┴──────┬─────┴─────┬──────┴──────────────────────┘
      │             │           │
      ▼             ▼           ▼
┌──────────┐  ┌──────────┐  ┌───────────────────┐
│PostgreSQL│  │ Ollama / │  │ Market APIs       │
│   15     │  │ Gemini / │  │ (AMFI / YFinance) │
│          │  │ OpenAI   │  │                   │
└──────────┘  └──────────┘  └───────────────────┘
```

---

## 🛠 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React, TypeScript, Vite | React 19, TS 6.0, Vite 8.2 |
| **Styling** | Tailwind CSS, Lucide Icons | Tailwind 4.3 |
| **Charts** | Recharts | 3.10 |
| **Routing** | React Router DOM | 7.18 |
| **HTTP Client** | Axios | 1.19 |
| **Backend** | Python, Flask | Flask 3.0.3 |
| **ORM** | SQLAlchemy (Flask-SQLAlchemy) | 3.1.1 |
| **Database** | PostgreSQL | 15 (Alpine) |
| **Auth** | JWT (Flask-JWT-Extended), BCrypt | 4.6.0 / 4.1.2 |
| **AI Providers** | Ollama, Google Gemini, OpenAI | Multi-provider |
| **OCR** | Tesseract (pytesseract), Pillow | 0.3.13 / 12.3 |
| **Testing** | Pytest (backend), Vitest (frontend) | 8.2 / 4.1 |
| **Linting** | OxLint | 1.75 |
| **Containerization** | Docker, Docker Compose | Compose 3.8 |

---

## 📁 Project Structure

```
FinWise_AI/
├── backend/                          # Flask REST API
│   ├── app/
│   │   ├── __init__.py               # App factory, extension init, blueprint registration
│   │   ├── config.py                 # Environment-based configuration
│   │   ├── models.py                 # SQLAlchemy ORM models (12 entities)
│   │   ├── routes/                   # API Blueprint route handlers
│   │   │   ├── auth.py               #   Authentication & profile management
│   │   │   ├── expense.py            #   Expense CRUD with filtering
│   │   │   ├── income.py             #   Income source management
│   │   │   ├── budget.py             #   Budget creation & progress tracking
│   │   │   ├── goal.py               #   Financial goal management
│   │   │   ├── ai.py                 #   AI categorization, chat, OCR, voice
│   │   │   ├── analytics.py          #   Spending analytics & trends
│   │   │   ├── health.py             #   Financial health score calculation
│   │   │   ├── investment.py         #   Recommendations & simulator
│   │   │   ├── portfolio.py          #   Portfolio holdings management
│   │   │   ├── notifications.py      #   Alert system endpoints
│   │   │   └── achievements.py       #   Gamification badge endpoints
│   │   └── services/                 # Business logic layer
│   │       ├── ai_service.py         #   Multi-provider AI abstraction (~52KB)
│   │       ├── recommendation_service.py  #   Explainable investment engine
│   │       ├── market_service.py     #   Live market data integration (~46KB)
│   │       ├── health_service.py     #   Financial Health Score engine
│   │       ├── portfolio_service.py  #   Portfolio analytics
│   │       ├── ocr_service.py        #   Receipt OCR processing
│   │       ├── report_service.py     #   Financial report generation
│   │       ├── notification_service.py  #   Alert generation logic
│   │       └── achievement_service.py   #   Gamification engine
│   ├── tests/                        # 20 test modules (pytest)
│   ├── Dockerfile                    # Python 3.11-slim container
│   ├── requirements.txt              # Python dependencies
│   └── run.py                        # App entry point & CLI commands
│
├── frontend/                         # React SPA
│   ├── src/
│   │   ├── App.tsx                   # Router & protected route config
│   │   ├── main.tsx                  # React DOM entry point
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # JWT auth state management
│   │   ├── components/
│   │   │   └── SidebarLayout.tsx      # Responsive navigation sidebar
│   │   ├── pages/                    # 20 page components
│   │   │   ├── LandingPage.tsx        #   Marketing landing page
│   │   │   ├── LoginPage.tsx          #   User authentication
│   │   │   ├── RegisterPage.tsx       #   User registration
│   │   │   ├── DashboardPage.tsx      #   Financial overview dashboard
│   │   │   ├── ExpensesPage.tsx       #   Expense management
│   │   │   ├── IncomePage.tsx         #   Income tracking
│   │   │   ├── BudgetPage.tsx         #   Budget management
│   │   │   ├── GoalsPage.tsx          #   Savings goals
│   │   │   ├── AICoachPage.tsx        #   AI financial advisor chat
│   │   │   ├── FinancialHealthPage.tsx #  Health score visualization
│   │   │   ├── FinancialReportsPage.tsx # AI-generated reports
│   │   │   ├── MarketPage.tsx         #   Live market data
│   │   │   ├── StockAnalysisPage.tsx  #   Stock fundamentals
│   │   │   ├── MutualFundsPage.tsx    #   Mutual fund analysis
│   │   │   ├── RiskAssessmentPage.tsx #   Risk profiling quiz
│   │   │   ├── InvestmentRecommendationsPage.tsx # AI recommendations
│   │   │   ├── InvestmentSimulatorPage.tsx # SIP & lump sum calculator
│   │   │   ├── PortfolioPage.tsx      #   Portfolio management
│   │   │   ├── NotificationsPage.tsx  #   Alert center
│   │   │   └── AchievementsPage.tsx   #   Gamification badges
│   │   └── utils/
│   │       ├── api.ts                 # Axios instance with JWT interceptors
│   │       └── calculations.ts        # Financial calculation utilities
│   ├── Dockerfile                    # Node 20-alpine container
│   ├── package.json                  # Frontend dependencies
│   └── vite.config.ts                # Vite build configuration
│
├── docs/                             # Technical documentation
│   ├── architecture.md               # System design overview
│   ├── api.md                        # API endpoint reference
│   ├── ai.md                         # AI provider architecture
│   ├── database.md                   # Entity-relationship documentation
│   ├── security.md                   # Security & privacy design
│   ├── deployment.md                 # Docker & local setup guide
│   └── recommendation-engine.md      # Investment scoring methodology
│
├── docker-compose.yml                # Multi-container orchestration
├── .env.example                      # Environment variable template
├── .gitignore                        # Git ignore rules
└── LICENSE                           # MIT License
```

---

## 🗄 Database Schema

The platform uses **12 relational entities** managed via SQLAlchemy ORM:

```
                         ┌────────────┐
                         │   users    │
                         └─────┬──────┘
                               │ 1:N
       ┌────────┬──────────┬───┴───┬──────────┬──────────┐
       ▼        ▼          ▼       ▼          ▼          ▼
  ┌─────────┐ ┌────────┐ ┌─────┐ ┌──────┐ ┌────────┐ ┌──────────┐
  │profiles │ │incomes │ │exps │ │goals │ │budgets │ │portfolios│
  └─────────┘ └────────┘ └─────┘ └──────┘ └────────┘ └──────────┘
       │
       ▼
  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐
  │ risk_profiles│  │ ai_sessions  │  │ notifications │  │ achievements │
  └──────────────┘  │ + messages   │  └───────────────┘  └──────────────┘
                    └──────────────┘
```

**Core Entities**: `User`, `UserProfile`, `Income`, `Expense`, `Budget`, `FinancialGoal`, `EmergencyFund`, `FinancialScore`, `RiskProfile`, `PortfolioHolding`, `Notification`, `Achievement`

**AI Entities**: `AIConversation`, `AIMessage`, `AICorrection`

---

## 🔌 API Endpoints

All endpoints return JSON. Protected routes require `Authorization: Bearer <token>`.

| Module | Prefix | Key Endpoints |
|---|---|---|
| **Auth** | `/api/auth` | `POST /register`, `POST /login`, `GET /profile`, `PUT /profile`, `PUT /change-password` |
| **Expenses** | `/api/expenses` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` (supports search, category, date filters) |
| **Income** | `/api/income` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| **Budgets** | `/api/budgets` | `GET /` (with spending progress), `POST /`, `PUT /:id`, `DELETE /:id` |
| **Goals** | `/api/goals` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| **AI** | `/api/ai` | `POST /categorize`, `POST /chat`, `POST /ocr`, `POST /voice`, `POST /report` |
| **Analytics** | `/api/analytics` | `GET /summary`, `GET /trends`, `GET /category-breakdown` |
| **Health** | `/api/financial-health` | `GET /score`, `POST /calculate` |
| **Investments** | `/api/investments` | `POST /recommendations`, `POST /simulate` |
| **Portfolio** | `/api/portfolio` | `GET /`, `POST /holdings`, `DELETE /holdings/:id` |
| **Notifications** | `/api/notifications` | `GET /`, `PUT /:id/read` |
| **Achievements** | `/api/achievements` | `GET /` |

---

## 🤖 AI Engine

FinWise AI uses a **strategy pattern** to support multiple AI providers interchangeably:

```
                     ┌───────────────────┐
                     │   AIProvider      │
                     │   (Interface)     │
                     └────────┬──────────┘
                              │
     ┌─────────────┬──────────┼──────────┬────────────┐
     ▼             ▼          ▼          ▼            ▼
 Heuristic     Gemini      Ollama     OpenAI      (Future)
 (Offline)     (Cloud)     (Local)    (Cloud)
```

| Provider | Mode | Config Key | Details |
|---|---|---|---|
| **Heuristic** | 100% Offline | `AI_PROVIDER=heuristic` | Rule-based regex matching. Default fallback, no API keys needed |
| **Ollama** | Local LLM | `AI_PROVIDER=ollama` | Supports `gemma2:2b`, `llama3`, `mistral`, `qwen` |
| **Gemini** | Cloud API | `AI_PROVIDER=gemini` | Google AI Studio, `gemini-1.5-flash` |
| **OpenAI** | Cloud API | `AI_PROVIDER=openai` | OpenAI API, `gpt-4o-mini` |

**Self-Correction**: User corrections to AI predictions are stored in `AICorrection` table and prioritized over LLM outputs for future matching inputs.

---

## 🚀 Setup & Installation

### Prerequisites

- **Docker Desktop** (recommended) — OR —
- **Python 3.11+** and **Node.js 20+** (for local dev)
- **PostgreSQL 15** (if running locally without Docker)

---

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-username/FinWise_AI.git
cd FinWise_AI

# 2. Copy environment variables
cp .env.example .env

# 3. Build and start all services
docker-compose up --build
```

Once running:
- 🌐 **Frontend**: [http://localhost:5173](http://localhost:5173)
- 🔧 **Backend API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- 🗄 **Database**: `localhost:5432` (PostgreSQL)

---

### Option 2: Local Development (Without Docker)

#### Backend

```powershell
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the Flask server
python run.py
```

> Flask will start on **http://localhost:5000**. Database tables are auto-created on first run.

#### Frontend

```powershell
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```

> Vite will start on **http://localhost:5173** with hot module reloading.

---

### Optional: Local Ollama AI

To use a local, offline LLM:

```bash
# 1. Install Ollama (https://ollama.com)

# 2. Pull a model
ollama pull gemma2:2b

# 3. Update .env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
# (Use http://host.docker.internal:11434 if running Flask in Docker)
```

---

## ⚙ Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `FLASK_APP` | Flask entry point | `run.py` |
| `FLASK_ENV` | Environment mode | `development` |
| `SECRET_KEY` | Flask session secret | `dev_secret_key_12345` |
| `JWT_SECRET_KEY` | JWT signing secret | `jwt_dev_secret_key_12345` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...@db:5432/finwise_db` |
| `AI_PROVIDER` | AI engine (`ollama`, `gemini`, `openai`, `heuristic`) | `ollama` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://host.docker.internal:11434` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | *(empty)* |
| `TESSERACT_CMD` | Path to Tesseract binary (optional) | *(auto-detect)* |

> ⚠ **Production**: Always replace `SECRET_KEY` and `JWT_SECRET_KEY` with strong random values.

---

## 🧪 Testing

### Backend (Pytest)

The backend includes **20 test modules** covering all major features:

```bash
cd backend
python -m pytest tests/ -v
```

Test coverage includes: authentication, expenses, income, budgets, goals, AI categorization, coaching, OCR, voice parsing, analytics, financial health, investments, portfolio, notifications, achievements, risk assessment, simulator, and reports.

### Frontend (Vitest)

```bash
cd frontend
npm run test
```

---

## 🔒 Security

| Layer | Implementation |
|---|---|
| **Password Hashing** | BCrypt with random salt per user |
| **Authentication** | JWT tokens with 2-hour expiry via `Flask-JWT-Extended` |
| **Data Isolation** | All queries scoped to `user_id` from JWT claims — zero cross-user data leakage |
| **SQL Injection** | Fully prevented via SQLAlchemy ORM parameterized queries |
| **AI Privacy** | Only aggregated financial metrics sent to AI providers — never credentials or raw dumps |
| **Error Masking** | Production error handlers return clean JSON without stack traces |
| **CORS** | Configured for frontend origin access to `/api/*` routes |

---

## 📚 Documentation

Detailed technical documentation is available in the [`/docs`](docs/) directory:

| Document | Contents |
|---|---|
| [`architecture.md`](docs/architecture.md) | System design, component layers, and data flow |
| [`api.md`](docs/api.md) | Complete API endpoint reference |
| [`ai.md`](docs/ai.md) | AI provider abstraction and self-correction engine |
| [`database.md`](docs/database.md) | Entity-relationship diagrams and table schemas |
| [`security.md`](docs/security.md) | Authentication, data isolation, and privacy architecture |
| [`deployment.md`](docs/deployment.md) | Docker Compose and local setup instructions |
| [`recommendation-engine.md`](docs/recommendation-engine.md) | Investment scoring methodology and explainability |

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

---

## ⚠ Disclaimer

*FinWise AI provides educational information and personalized analytical insights for informational purposes only. It is not a substitute for professional financial advice. Investment decisions involve risk, and past performance does not guarantee future results. Users should conduct their own research or consult a qualified financial professional before making investment decisions.*
