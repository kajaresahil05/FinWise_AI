# FinWise AI — API Endpoint Reference

All endpoints return JSON responses. Protected endpoints require the header `Authorization: Bearer <token>`.

---

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new user profile.
- `POST /api/auth/login` — Login user & return JWT token.
- `GET /api/auth/profile` — Get user profile & preferences.
- `PUT /api/auth/profile` — Update user profile & risk metrics.
- `PUT /api/auth/change-password` — Update user password securely.

---

## 2. Expenses & Income (`/api/expenses`, `/api/income`)
- `GET /api/expenses` — List transactions with search, category, and date filtering.
- `POST /api/expenses` — Add a new expense.
- `PUT /api/expenses/:id` — Update expense item.
- `DELETE /api/expenses/:id` — Delete expense item.
- `GET /api/income` — List income sources.
- `POST /api/income` — Record new income source.

---

## 3. Budget & Goals (`/api/budgets`, `/api/goals`)
- `GET /api/budgets` — List monthly category budgets with spending progress.
- `POST /api/budgets` — Set up category budget.
- `GET /api/goals` — List active savings goals.
- `POST /api/goals` — Add savings target.

---

## 4. AI Services (`/api/ai`)
- `POST /api/ai/categorize` — Classify transaction text using AI/Heuristics.
- `POST /api/ai/chat` — Conversational AI Financial Coach.
- `POST /api/ai/ocr` — Extract text & line items from receipt images.
- `POST /api/ai/voice` — Parse natural voice entry into transaction fields.
- `POST /api/ai/report` — Generate monthly AI financial summary report.

---

## 5. Investment & Recommendations (`/api/investments`, `/api/portfolio`)
- `POST /api/investments/recommendations` — Generate explainable personalized investment asset allocation.
- `POST /api/investments/simulate` — Run SIP, Lump Sum, and What-If financial simulations.
- `GET /api/portfolio` — Fetch user holdings and asset allocation breakdown.
- `POST /api/portfolio/holdings` — Add stock, mutual fund, or ETF holding.

---

## 6. Notifications & Gamification (`/api/notifications`, `/api/achievements`)
- `GET /api/notifications` — Fetch user alerts and unread status.
- `PUT /api/notifications/:id/read` — Mark notification as read.
- `GET /api/achievements` — List unlocked badges and gamification progress.
