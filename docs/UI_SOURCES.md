# UI Sources & Inspirations

This document maps the UI components in Stockify to their original open-source inspirations. Note that these are inspirations and patterns; we re-implement them securely within our architecture rather than copy-pasting code directly.

| Stockify Component / Section | Inspiration Source | Purpose / Notes |
| :--- | :--- | :--- |
| **AppShell Layout** | [shadcn-admin](https://github.com/satnaing/shadcn-admin), [taxonomy](https://github.com/shadcn-ui/taxonomy) | Sidebar navigation patterns, responsive collapsible sidebar, breadcrumbs, top navigation bar. |
| **Dashboard Layout** | [Financial-Dashboard-32](https://github.com/BankkRoll/Financial-Dashboard-32) | Top KPI cards row, main portfolio chart area, recent activity feed, side watchlist panel. |
| **Dashboard Blocks & DataTables** | [ShadcnVaults](https://github.com/jinsup-lee/shadcn-vaults), `shadcn/ui` Blocks | Empty states, basic stat cards, table layouts, filters. |
| **Public Landing Page** | [shadcn-dashboard-landing-template](https://github.com/mickasmt/shadcn-dashboard-landing-template) | Marketing hero, generic feature blocks, pricing table (if applicable), CTA section. |
| **Market Detail Page** | [stocks (DariusLukasukas)](https://github.com/DariusLukasukas/stocks) | Stock quote header (price, change, name), tab layout for chart/fundamentals/news/order book. |
| **Charting Library** | [lightweight-charts](https://github.com/tradingview/lightweight-charts) | Interactive trading charts (candlestick, area, baseline) for portfolio and market symbol pages. |
| **Order Book Widget (Optional)** | [@lab49/react-order-book](https://github.com/lab49/react-order-book) | Simulated Level 2 order book widget on market detail pages. |
