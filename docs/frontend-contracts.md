# Frontend Contract Map

All function requests require `Authorization: Bearer <access_token>`.
Base URL: `https://<ref>.supabase.co/functions/v1`

## Common Patterns
- Errors: `4xx/5xx` with JSON `{ "error": "message" }`
- Pagination (where supported): `page` (1-based), `page_size`; response often includes `page_size`, `offset`
- Auth: JWT is validated inside each Edge Function (`requireAuth`)

---

## 1. Auth & User

### Supabase Auth (client)
- `supabase.auth.signUp`
- `supabase.auth.signInWithPassword`
- `supabase.auth.resetPasswordForEmail`

### User Edge Function (`/user`)
| Method | Path | Body | Role | Description |
|---|---|---|---|---|
| POST | `/invite` | `{ email, role, class_id?, org_id?, expires_days? }` | Teacher+ | Invite user. |
| POST | `/role_update` | `{ user_id, role }` | Admin | Change user role. |

---

## 2. Trading

### Trade Edge Function (`/trade`)
| Method | Path | Body/Query | Description |
|---|---|---|---|
| POST | `/place` | `{ account_id, client_request_id, payload: { symbol, side, qty, order_type, limit_price?, stop_price?, tif, competition_id? } }` | Place order (current frontend shape). Legacy flat order fields are still accepted server-side for compatibility. |
| POST | `/cancel` | `{ order_id }` | Cancel open order. |
| GET | `/orders` | `account_id, status?, page, page_size` | List orders. |
| GET | `/fills` | `account_id, page, page_size` | List fills. |
| GET | `/positions` | `account_id, page, page_size` | Holdings/positions with price and PnL fields. |
| GET | `/equity` | `account_id, as_of_ts?` | Compute total equity. |

---

## 3. Teacher Console

### Teacher Console Edge Function (`/teacher-console`)
| Method | Path | Body/Query | Description |
|---|---|---|---|
| GET | `/roster` | `class_id, page, page_size` | List enrolled students + account stats (`equity`, `cash_balance`, `starting_cash`). |
| POST | `/freeze` | `{ scope_type: "class"\|"account", scope_id, is_trading_enabled, reason }` | Freeze/unfreeze class or account trading. |
| POST | `/competition/upsert_rules` | `{ class_id, competition_id?, name, status, rules_json, auto_lock_trading }` | Create/update competition + rules. |
| POST | `/account/reset` | `{ account_id, starting_cash? }` | Reset student account. |
| POST | `/announcements/create` | `{ class_id, title, body }` | Create class announcement. |
| GET | `/announcements` | `class_id` | List announcements. |
| GET | `/audit` | `class_id` | Teacher action audit log. |
| GET | `/signals` | `class_id, page, page_size` | Activity flags and rule violations. |
| POST | `/permissions/grant` | `{ class_id, account_id, permission_key, symbol?, expires_at? }` | Grant special permissions. |
| POST | `/exports/request` | `{ class_id, competition_id?, type, filters? }` | Queue export job. |
| GET | `/exports/list` | `class_id` | List recent export jobs for a class. Returns normalized statuses: `queued` \| `processing` \| `done` \| `failed`. |
| GET | `/exports/download` | `job_id` | Poll export status and receive signed URL when complete. |
| GET | `/leaderboard` | `competition_id, date?, mode?, page, page_size` | Competition rankings. |
| GET | `/competitions` | `class_id` | List class competitions. |
| GET | `/analytics/student` | `student_id, competition_id?` | Student analytics and violations. |
| GET | `/incident_mode` | - | Read global incident mode. |
| POST | `/incident_mode` | `{ paused, reason }` | Set global incident mode (platform admin). |

---

## 4. Market, Symbols, Watchlists, Charts

### Symbols Edge Function (`/symbols`)
| Method | Path | Query | Description |
|---|---|---|---|
| GET | `/search` | `q, limit, offset` | Search symbols. |
| GET | `/featured` | `class_id?, competition_id?, limit, offset` | Featured symbols. |
| GET | `/quote` | `symbol` | Latest quote. |

### Watchlists Edge Function (`/watchlists`)
| Method | Path | Body/Query | Description |
|---|---|---|---|
| GET | `/` | `owner_type?, limit, offset` | List watchlists. |
| POST | `/create` | `{ owner_type, owner_id, name }` | Create watchlist. |
| POST | `/add_item` | `{ watchlist_id, symbol }` | Add symbol. |
| POST | `/remove_item` | `{ watchlist_id, symbol }` | Remove symbol. |

### Charts Edge Function (`/charts`)
| Method | Path | Query | Description |
|---|---|---|---|
| GET | `/context` | `symbol, competition_id?, account_id?` | Chart context + account overlays + trading rules summary. |
| GET | `/ohlc` | `symbol, tf, from?, to?, limit?` | OHLC bars. Response bars use `{ time, open, high, low, close, volume }`. |

OHLC response example:
```json
{
  "bars": [
    {
      "time": 1698000000,
      "open": 150.5,
      "high": 151.0,
      "low": 150.0,
      "close": 150.8,
      "volume": 10500
    }
  ],
  "meta": {
    "tf": "5m",
    "last_updated_at": "2026-02-28T17:00:00.000Z",
    "stale": false
  }
}
```

---

## 5. Class / School / Org

### Class Edge Function (`/class`)
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/create` | `{ name, school_id, teacher_id?, org_id? }` | Create class. |
| POST | `/rotate_join_code` | `{ class_id }` | Rotate join code. |
| POST | `/resolve-code` | `{ code }` | Resolve class code for onboarding confirmation. |
| POST | `/join` | `{ class_id }` | Join by class id and initialize account/enrollment. |
| POST | `/join_via_code` | `{ join_code }` | Compatibility route: join directly by code. |

### School Edge Function (`/school`)
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/create` | `{ name, org_id? }` | Create school. |

---

## 6. Leaderboard & Analytics Response Shapes

### `GET /teacher-console/leaderboard`
```json
{
  "generated_at": "ISO8601",
  "rankings": [
    {
      "student_id": "uuid",
      "display_name": "Student A",
      "rank": 1,
      "prev_rank": 2,
      "score": 105.5,
      "equity": 105000,
      "return_pct": 5,
      "penalties": 0,
      "breakdown": {}
    }
  ],
  "page_size": 100,
  "offset": 0
}
```

### `GET /teacher-console/analytics/student`
`metrics.drawdown_max` is ratio-style decimal (for example `-0.08` = `-8%`).

```json
{
  "student_id": "uuid",
  "competition_id": "uuid|null",
  "equity_curve": [
    { "date": "2026-02-20", "equity": 100000 },
    { "date": "2026-02-21", "equity": 101000 }
  ],
  "metrics": {
    "sharpe": 1.1,
    "drawdown_max": -0.08,
    "win_rate": 0.62
  },
  "violations": [
    {
      "id": "uuid",
      "rule_key": "max_position_size_pct",
      "severity": "warning",
      "created_at": "2026-02-21T14:03:00.000Z",
      "resolved_at": null
    }
  ]
}
```

### `GET /student/leaderboard`
```json
{
  "competition_id": "uuid",
  "generated_at": "ISO8601",
  "rankings": [
    {
      "student_id": "uuid",
      "display_name": "Student A",
      "rank": 1,
      "prev_rank": 1,
      "score": 103.4,
      "equity": 103400,
      "return_pct": 3.4,
      "penalties": 0,
      "breakdown": {},
      "is_me": true
    }
  ]
}
```

---

## 7. Realtime

### Supabase channel: `public:events`
- Postgres changes watched in frontend:
  - `orders` (`*`, account-filtered)
  - `fills` (`INSERT`, account-filtered)
  - `trading_controls` (`*`)
  - `announcements` (`INSERT`)
- Broadcast event watched in frontend:
  - `order.created`
