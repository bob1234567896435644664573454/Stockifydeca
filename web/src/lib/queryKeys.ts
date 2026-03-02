export const queryKeys = {
    auth: {
        session: ['auth', 'session'] as const,
        profile: ['auth', 'profile'] as const,
    },
    student: {
        dashboard: (accountId: string) => ['student', 'dashboard', accountId] as const,
        orders: (accountId: string, status?: string) => ["student", "orders", accountId, status] as const,
        fills: (accountId: string) => ['student', 'fills', accountId] as const,
        positions: (accountId: string) => ["student", "positions", accountId] as const,
        equity: (accountId: string) => ["student", "equity", accountId] as const,
        portfolio: ["student", "portfolio"] as const,
        leaderboard: (competitionId: string) => ["student", "leaderboard", competitionId] as const,
    },
    teacher: {
        classes: ["teacher", "classes"] as const,
        roster: (classId: string) => ["teacher", "roster", classId] as const,
        competitions: (classId: string) => ["teacher", "competitions", classId] as const,
        announcements: (classId: string) => ['teacher', 'announcements', classId] as const,
        signals: (classId: string) => ['teacher', 'signals', classId] as const,
        exports: (classId: string) => ['teacher', 'exports', classId] as const,
    },
    market: {
        symbols: (query: string) => ['market', 'symbols', query] as const,
        featured: (classId: string) => ['market', 'featured', classId] as const,
        chartContext: (symbol: string) => ['market', 'chartContext', symbol] as const,
        detail: (symbol: string) => ["market", symbol] as const,
        watchlists: ['market', 'watchlists'] as const,
    },
    charts: {
        ohlc: (symbol: string, timeframe: string) => ["charts", "ohlc", symbol, timeframe] as const,
    },
}
