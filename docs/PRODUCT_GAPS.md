# PRODUCT_GAPS — What's Missing vs. Perfect Stockify

> Generated 2026-03-01.  Each gap references the product surface it belongs to.

## Legend
- 🔴 **Missing** — Surface/feature does not exist at all
- 🟡 **Stub/Mock** — UI exists but uses hardcoded data, not wired to backend
- 🟢 **Live** — Functional and wired

---

## B1 — Public Home Page  🔴
- No marketing/landing page exists. Unauthenticated users hit `/auth` directly.
- No product explanation, screenshots, teacher CTA, or demo request flow.

## B2 — Onboarding  🟡
- `OnboardingPage.tsx` exists: captures experience level + goal + join code. Persists to `user_preferences`.
- **Gap:** Does not set expectation "graded on process, not just profit."
- **Gap:** Does not introduce journaling or risk previews.
- **Gap:** Does not start a first micro-lesson immediately after onboarding.

## B3 — Student Dashboard  🟢 (with gaps)
- Equity curve, cash, holdings, metrics, diversification/HHI, recent trades — all live via `portfolio-calc.ts`.
- **Gap:** No "why you traded" notes visible alongside recent trades (no journal linkage on dashboard).
- **Gap:** AI insights panel (`DailyBrief`) uses simulated data, not real portfolio-aware AI.

## B4 — Research Workspace + Thesis Builder  🔴
- No Research page exists. No company snapshot component.
- No Thesis Builder ("I believe… because…", "I'm wrong if…", "Time horizon…", "Risk plan…").
- No integration between thesis and trade ticket or journal.

## B5 — Trading Simulator (Order Ticket)  🟢 (with gaps)
- `OrderTicket.tsx` exists with `previewTradeImpact` integration.
- **Gap:** Impact Preview panel may not show all required warnings (single holding > 35%, overconcentration delta).
- **Gap:** No post-submit journal prompt ("Why did you make this trade?").

## B6 — Journal + Reflection  🟡
- `JournalPage.tsx` exists with structured reflection fields (what/why/expect/wrong/exit + rating).
- **Gap:** Entries are client-side only, derived from order data. Not persisted to `journal_entries` table in Supabase.
- **Gap:** No weekly reflection summaries.
- **Gap:** No AI pattern insights wired to real journal data.
- **Gap:** Not teacher-visible in classroom mode.

## B7 — Gamification  🟡
- `ChallengesPage.tsx` exists with hardcoded challenges and achievements.
- **Gap:** Progress is not tracked in Supabase (`challenge_progress`, `user_achievements` tables exist but unused).
- **Gap:** No process-score leaderboard (risk-adjusted return + journaling + diversification).
- **Gap:** Missions are static, not dynamic based on portfolio state.

## B8 — Teacher Dashboard (Classroom OS)  🟢 (with gaps)
- Roster, freeze, rules editor, announcements, audit log, leaderboard, exports — all live.
- **Gap:** No lesson assignment or journal requirement controls.
- **Gap:** No grading signals panel (lesson completion %, journal quality rubric, portfolio health score).
- **Gap:** No "process score" aggregation per student visible to teachers.

## B9 — AI Layer  🟡
- Schemas exist: `DailyBriefData`, `TradeMentorResponse`, `PortfolioAnalystResponse`, `JournalPatternInsight`.
- Rate limiter + hallucination guards + `dataSource` attribution exist.
- **Gap:** All AI responses are simulated (hardcoded response pools in `MentorPanel.tsx`).
- **Gap:** No actual LLM integration or API call to generate real responses.
- **Gap:** No portfolio-aware Daily Brief (uses static summary string).

---

## Cross-Cutting Gaps

| Area | Gap |
|------|-----|
| Dead code | `App.tsx` unused (router handles everything). `App.css` likely dead. |
| Duplicate logic | `AuthPage.tsx` defines its own `Input`/`Button`/`Label`/`Card` inline instead of using `components/ui/*`. |
| Test coverage | 5 spec files in `tests/` are placeholders (empty or minimal). |
| Security | `AuthPage.tsx` uses `window.prompt` for password reset — not ideal UX. |
| Naming | `lib/utils.ts` is minimal (just `cn` utility). `lib/formatters.ts` has a separate `formatCurrency` but `utils.ts` also exports one. Potential confusion. |

---

## Priority Order for Implementation

1. **Audit & hardening** (dead code, duplicates, inline components, test placeholders)
2. **B1 — Public Home Page** (first impression)
3. **B2 — Onboarding enhancements** (sets the learning culture)
4. **B6 — Journal persistence** (critical for the learn→practice→reflect loop)
5. **B5 — Order Ticket hardening** (post-trade journal prompt, warning completeness)
6. **B4 — Thesis Builder** (feeds journal + trade ticket)
7. **B7 — Gamification wiring** (Supabase persistence for challenges/achievements)
8. **B8 — Teacher grading signals** (lesson assignment, process scoring)
9. **B9 — AI layer** (simulate-first, stub for future LLM integration)
10. **B3 — Dashboard final polish** (journal linkage, real AI Daily Brief)
