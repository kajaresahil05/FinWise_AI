# FinWise AI — Security & Privacy Architecture

This document details the security mechanisms, data isolation protocols, and privacy standards implemented across the FinWise AI platform.

---

## 1. Authentication & Password Security
- **Password Hashing**: Passwords are never stored in plain text. Passwords are hashed using standard `werkzeug.security.generate_password_hash` with secure salt before database insertion.
- **JWT Authorization**: Authenticated API requests use JSON Web Tokens (`Flask-JWT-Extended`) signed with a 256-bit secret key.
- **Token Lifespan**: Access tokens expire after 2 hours.

---

## 2. User Data Isolation
- **Tenant Isolation**: Every database entity (`Income`, `Expense`, `Budget`, `FinancialGoal`, `PortfolioHolding`, `AICorrection`, `Notification`, `Achievement`) has a strict foreign key relationship to `user_id`.
- **Query Scoping**: All database queries enforce filtering on `user_id == get_jwt_identity()`. A user cannot view, edit, or delete another user's financial data.

---

## 3. SQL Injection & Input Sanitization
- **ORM Protection**: Database queries use SQLAlchemy ORM parameterized queries, completely neutralizing SQL Injection attacks.
- **Input Validation**: API routes perform type checks and boundary validation on incoming JSON payloads.

---

## 4. Privacy-by-Design in AI Integration
- **Context Filtering**: Only relevant aggregated numerical financial metrics (e.g. total monthly expense, active category budgets) are sent to the AI service.
- **No Credentials Sent to AI**: Passwords, email addresses, hashes, or complete raw database dumps are never passed to external or local LLM providers.
- **Configurable Providers**: Users can choose between offline `HeuristicProvider`, local `OllamaProvider`, or API-backed `GeminiProvider`/`OpenAIProvider`.

---

## 5. Safe Error Handling & Masking
- **No Stack Trace Exposure**: Production Flask error handlers intercept HTTP `500 Internal Server Error` and HTTP `404 Not Found`, returning clean JSON error responses (`{"error": "Internal server error"}`) without leaking stack traces or configuration secrets.

---

## 6. Financial Disclaimer Compliance
- All investment recommendations, stock metrics, and mutual fund analytical displays incorporate the mandatory educational financial disclaimer:
  > *"FinWise AI provides educational information and personalized analytical insights for informational purposes only. It is not a substitute for professional financial advice."*
