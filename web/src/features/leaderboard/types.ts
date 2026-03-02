export interface ScoreBreakdown {
    raw_return: number
    volatility_penalty: number
    violation_penalty: number
}

export interface Ranking {
    student_id?: string
    display_name?: string
    rank: number
    prev_rank: number
    score: number
    equity: number
    return_pct: number
    penalties: number
    breakdown?: ScoreBreakdown
    is_me?: boolean
}

export interface LeaderboardResponse {
    competition_id?: string
    generated_at: string
    rankings: Ranking[]
    page_size?: number
    offset?: number
}
