# FinWise AI — Database Schema & Entity Documentation

FinWise AI utilizes a relational database structure designed with SQLAlchemy ORM and PostgreSQL.

---

## Entity Relationship Summary

```
                       +----------------+
                       |     users      |
                       +-------+--------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
+--------------+       +---------------+       +---------------+
|user_profiles |       |   incomes     |       |   expenses    |
+--------------+       +---------------+       +---------------+
       |                       |                       |
       v                       v                       v
+--------------+       +---------------+       +---------------+
|risk_profiles |       |    budgets    |       |financial_goals|
+--------------+       +---------------+       +---------------+
       |                       |                       |
       v                       v                       v
+--------------+       +---------------+       +---------------+
|portfolios /  |       | notifications |       | achievements  |
| holdings     |       +---------------+       +---------------+
+--------------+
```

---

## Key Table Structures

### 1. `users`
- `id` (INTEGER, Primary Key)
- `email` (VARCHAR(120), Unique, Indexed)
- `password_hash` (VARCHAR(256), Encrypted password)
- `created_at` (DATETIME)

### 2. `user_profiles`
- `id` (INTEGER, Primary Key)
- `user_id` (INTEGER, Foreign Key -> `users.id`)
- `name` (VARCHAR(100))
- `age` (INTEGER)
- `currency` (VARCHAR(10), Default 'INR')
- `monthly_income` (NUMERIC(12,2))
- `monthly_expenses` (NUMERIC(12,2))
- `monthly_savings` (NUMERIC(12,2))
- `investment_horizon_years` (INTEGER)
- `risk_tolerance` (VARCHAR(30))

### 3. `expenses`
- `id` (INTEGER, Primary Key)
- `user_id` (INTEGER, Foreign Key -> `users.id`)
- `amount` (NUMERIC(12,2))
- `category` (VARCHAR(50), Indexed)
- `subcategory` (VARCHAR(50))
- `date` (DATE, Indexed)
- `payment_method` (VARCHAR(30))
- `merchant` (VARCHAR(100))
- `description` (TEXT)

### 4. `incomes`
- `id` (INTEGER, Primary Key)
- `user_id` (INTEGER, Foreign Key -> `users.id`)
- `source` (VARCHAR(50))
- `amount` (NUMERIC(12,2))
- `date` (DATE)
- `is_recurring` (BOOLEAN)

### 5. `budgets`
- `id` (INTEGER, Primary Key)
- `user_id` (INTEGER, Foreign Key -> `users.id`)
- `category` (VARCHAR(50))
- `amount` (NUMERIC(12,2))
- `alert_threshold_percent` (INTEGER, Default 80)

### 6. `financial_goals`
- `id` (INTEGER, Primary Key)
- `user_id` (INTEGER, Foreign Key -> `users.id`)
- `name` (VARCHAR(100))
- `target_amount` (NUMERIC(12,2))
- `current_amount` (NUMERIC(12,2))
- `target_date` (DATE)

### 7. `portfolio_holdings`
- `id` (INTEGER, Primary Key)
- `user_id` (INTEGER, Foreign Key -> `users.id`)
- `asset_type` (VARCHAR(30)) — Stock, Mutual Fund, ETF
- `symbol` (VARCHAR(30))
- `name` (VARCHAR(100))
- `quantity` (NUMERIC(12,4))
- `purchase_price` (NUMERIC(12,2))

### 8. `notifications` & `achievements`
- Track automated real-time alert logs and gamification badges unlocked by the user.
