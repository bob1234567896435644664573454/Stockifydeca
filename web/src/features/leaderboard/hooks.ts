import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { LeaderboardResponse } from "./types"

export function useTeacherLeaderboard(competitionId: string, date?: string, mode?: string) {
    return useQuery({
        queryKey: ["teacher-leaderboard", competitionId, date, mode],
        queryFn: async () => {
            if (!competitionId) return null
            const params: Record<string, string | number> = { competition_id: competitionId }
            if (date) params.date = date
            if (mode) params.mode = mode

            const res = await api.get<LeaderboardResponse>(`/teacher-console/leaderboard`, params)
            return res
        },
        enabled: !!competitionId
    })
}

export function useStudentLeaderboard(competitionId: string) {
    return useQuery({
        queryKey: ["student-leaderboard", competitionId],
        queryFn: async () => {
            if (!competitionId) return null
            const params = { competition_id: competitionId }

            const res = await api.get<LeaderboardResponse>(`/student/leaderboard`, params)
            return res
        },
        enabled: !!competitionId
    })
}
