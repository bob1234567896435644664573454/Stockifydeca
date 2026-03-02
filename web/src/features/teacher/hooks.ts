import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { supabase } from "@/lib/api" // Import supabase for classes query if needed, or switch to api.get
import { useAuth } from "@/features/auth/AuthContextObject"
import { queryKeys } from "@/lib/queryKeys"
import type { MarketContext } from "@/features/student/hooks"

export interface ClassItem {
    id: string
    name: string
    section?: string
    code: string
    trading_controls?: {
        is_trading_enabled: boolean
    }
}

export type RosterItem = {
    student_id: string
    display_name: string
    email?: string
    enrollment_status: "active" | "frozen" | "dropped"
    account_id?: string
    equity?: number
    cash_balance?: number
    starting_cash?: number
    day_pnl?: number
    last_login?: string
}

export type RosterResponse = {
    class_id: string
    roster: RosterItem[]
    page_size: number
    offset: number
}

export function useTeacherClasses() {
    const { user } = useAuth()

    return useQuery({
        queryKey: queryKeys.teacher.classes,
        queryFn: async () => {
            if (!user) return []

            // 1. Fetch classes
            const { data: classData, error: classError } = await supabase
                .from("classes")
                .select("id,name,section,code")
                .eq("teacher_id", user.id)

            if (classError) throw classError
            if (!classData || classData.length === 0) return []

            // 2. Fetch trading controls for these classes
            const classIds = classData.map(c => c.id)
            const { data: controlData, error: controlError } = await supabase
                .from("trading_controls")
                .select("scope_id, is_trading_enabled")
                .eq("scope_type", "class")
                .in("scope_id", classIds)

            if (controlError) throw controlError

            const controlMap = new Map(
                (controlData ?? []).map(c => [c.scope_id, c.is_trading_enabled])
            )

            return classData.map(c => ({
                ...c,
                is_trading_enabled: controlMap.get(c.id) ?? true
            })) as (ClassItem & { is_trading_enabled: boolean })[]
        },
        enabled: !!user
    })
}

export function useClassRoster(classId: string, page = 1) {
    return useQuery({
        queryKey: [
            ...queryKeys.teacher.roster(classId),
            { page }
        ],
        queryFn: async () => {
            // api.get returns the data directly as per ApiClient implementation
            const data = await api.get<RosterResponse>('/teacher-console/roster', {
                class_id: classId,
                page,
                page_size: 50
            })
            return data.roster
        },
        enabled: !!classId
    })
}

export function useFreezeClass() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ classId, frozen }: { classId: string, frozen: boolean }) => {
            return api.post("/teacher-console/freeze", {
                scope_type: "class",
                scope_id: classId,
                is_trading_enabled: !frozen,
                reason: "Teacher manual toggle (Class-wide)"
            })
        },
        onSuccess: () => {
            toast.success("Class status updated")
            queryClient.invalidateQueries({ queryKey: ["teacher", "roster"] })
            queryClient.invalidateQueries({ queryKey: ["teacher", "classes"] })
        },
        onError: (err: Error) => toast.error(err.message)
    })
}

export function useFreezeStudent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ studentId, frozen }: { studentId: string, frozen: boolean }) => {
            // studentId here is expected to be the account_id based on previous analysis
            return api.post("/teacher-console/freeze", {
                scope_type: "account",
                scope_id: studentId,
                is_trading_enabled: !frozen,
                reason: "Teacher manual toggle"
            })
        },
        onSuccess: () => {
            toast.success("Student status updated")
            queryClient.invalidateQueries({ queryKey: ["teacher", "roster"] })
        },
        onError: (err: Error) => toast.error(err.message)
    })
}

export function useResetStudent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ accountId }: { accountId: string }) => {
            return api.post("/teacher-console/account/reset", {
                account_id: accountId,
                starting_cash: 100000
            })
        },
        onSuccess: () => {
            toast.success("Student account reset")
            queryClient.invalidateQueries({ queryKey: ["teacher", "roster"] })
        },
        onError: (err: Error) => toast.error(err.message)
    })
}

export interface CompetitionItem {
    id: string
    class_id: string
    name: string
    status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
    rules_json: Record<string, unknown>
    created_at: string
    updated_at: string
}

export function useClassCompetitions(classId: string) {
    return useQuery({
        queryKey: ["teacher", "competitions", classId],
        queryFn: async () => {
            if (!classId) return []
            const data = await api.get<{ competitions: CompetitionItem[] }>(`/teacher-console/competitions?class_id=${classId}`)
            return data.competitions
        },
        enabled: !!classId
    })
}

export interface Announcement {
    id: string
    class_id: string
    title: string
    content: string
    priority: 'low' | 'medium' | 'high'
    created_at: string
}

export function useClassAnnouncements(classId: string) {
    return useQuery({
        queryKey: ["teacher", "announcements", classId],
        queryFn: async () => {
            if (!classId) return []
            const data = await api.get<{ items: Announcement[] }>(`/teacher-console/announcements`, { class_id: classId })
            return data.items
        },
        enabled: !!classId
    })
}

export function useCreateAnnouncement() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: { class_id: string, title: string, content: string, priority: string }) => {
            return api.post("/teacher-console/announcements/create", {
                class_id: data.class_id,
                title: data.title,
                body: data.content
            })
        },
        onSuccess: (_, vars) => {
            toast.success("Announcement posted")
            queryClient.invalidateQueries({ queryKey: ["teacher", "announcements", vars.class_id] })
        },
        onError: (err: Error) => toast.error(err.message)
    })
}

export interface AuditLog {
    id: string
    action: string
    actor_id: string
    actor_name: string
    details: string
    created_at: string
    severity: "info" | "warning" | "critical"
}

export interface StudentAnalyticsResponse {
    student_id: string
    competition_id?: string
    equity_curve: { date: string; equity: number }[]
    metrics: {
        sharpe: number
        drawdown_max: number
        win_rate: number
    }
    violations: Array<{
        id: string
        rule_key: string
        severity: string
        created_at: string
    }>
}

export function useStudentAnalytics(studentId: string, competitionId?: string) {
    return useQuery({
        queryKey: ["teacher", "student-analytics", studentId, competitionId],
        queryFn: async () => {
            if (!studentId) return null
            return api.get<StudentAnalyticsResponse>("/teacher-console/analytics/student", {
                student_id: studentId,
                competition_id: competitionId
            })
        },
        enabled: !!studentId
    })
}

export function useAuditLog(classId: string) {
    return useQuery({
        queryKey: ["teacher", "audit", classId],
        queryFn: async () => {
            if (!classId) return []
            const data = await api.get<{ logs: AuditLog[] }>(`/teacher-console/audit`, { class_id: classId })
            return data.logs
        },
        enabled: !!classId
    })
}

export interface ExportJob {
    id: string
    type: string
    status: 'queued' | 'processing' | 'done' | 'failed'
    storage_path?: string
    error?: string
    created_at: string
}

export function useRequestExport() {
    return useMutation({
        mutationFn: async (payload: { class_id: string, competition_id?: string, type: string, filters?: any }) => {
            return api.post<{ job_id: string, status: string }>("/teacher-console/exports/request", payload)
        },
        onSuccess: () => {
            toast.success("Export job queued")
        },
        onError: (err: Error) => toast.error(err.message)
    })
}

export function useExportStatus(jobId: string) {
    return useQuery({
        queryKey: ["teacher", "export", jobId],
        queryFn: async () => {
            if (!jobId) return null
            return api.get<{ job_id: string, status: string, signed_url?: string }>("/teacher-console/exports/download", { job_id: jobId })
        },
        enabled: !!jobId,
        refetchInterval: (query) => {
            const status = query.state.data?.status
            return status === "done" || status === "failed" ? false : 3000
        }
    })
}

export function useExportJobs(classId: string) {
    return useQuery({
        queryKey: ["teacher", "exports", classId],
        queryFn: async () => {
            if (!classId) return []
            const data = await api.get<{ jobs: ExportJob[] }>("/teacher-console/exports/list", { class_id: classId })
            return data.jobs
        },
        enabled: !!classId,
        refetchInterval: 10000
    })
}
export function useMarketStatus() {
    return useQuery({
        queryKey: ["market", "status"],
        queryFn: async () => {
            // Mock or fetch real status. Using SPY as proxy for now if no dedicated endpoint
            const data = await api.get<MarketContext>('/charts/context?symbol=SPY')
            return {
                isOpen: data.market_status === 'open',
                nextEvent: data.market_status === 'open' ? 'Close' : 'Open',
                timeUntil: 'N/A',
                status: data.market_status || 'closed',
                timestamp: new Date().toISOString(),
                price: data.price
            }
        },
        refetchInterval: 60000
    })
}
