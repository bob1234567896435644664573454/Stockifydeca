# Stockify Frontend

Competition-grade trading platform frontend built with Vite, React, TailwindCSS, and shadcn/ui.

## Setup

1. **Install Dependencies**:
   ```bash
   cd deca/web
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```
   VITE_SB_URL=...
   VITE_SB_ANON_KEY=...
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Testing

Run E2E tests with Playwright:
```bash
npm install -D @playwright/test # One-time setup
npx playwright test
```

## Features

- **Authentication**: Role-based login (Student/Teacher).
- **Student App**:
  - Dashboard with Equity/Cash tracking.
  - TradingView Chart integration (Embed).
  - Real-time Order Ticket & Activity.
- **Teacher Console**:
  - Class management.
  - Roster view.
  - Controls (Freeze trading, Export reports).
- **Realtime**:
  - Global event subscription for instant updates on Orders/Fills.
