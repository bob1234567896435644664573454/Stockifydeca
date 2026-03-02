import { useState } from "react"
import { useTeacherLeaderboard, useStudentLeaderboard } from "./hooks"
import { DataTable } from "@/components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
// import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScoreBreakdown } from "./ScoreBreakdown"
import { formatCurrency, formatPct } from "@/lib/utils"
import type { Ranking } from "./types"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { ErrorState } from "@/components/ui/states"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { StudentProfile } from "@/features/analytics/StudentProfile"

interface Props {
    competitionId: string
    isTeacher?: boolean
}

export function LeaderboardPage({ competitionId, isTeacher = false }: Props) {
    const [mode, setMode] = useState("rules_compliance_weighted")
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
    const { data: teacherData, isLoading: tLoading, error: tError } = useTeacherLeaderboard(competitionId, undefined, mode)
    const { data: studentData, isLoading: sLoading, error: sError } = useStudentLeaderboard(competitionId)

    const data = isTeacher ? teacherData : studentData
    const isLoading = isTeacher ? tLoading : sLoading
    const error = isTeacher ? tError : sError

    if (error) {
        return <ErrorState title="Leaderboard Unavailable" description="Could not load rankings. Please try again later." />
    }

    const columns: ColumnDef<Ranking, any>[] = [
        {
            header: "Rank",
            accessorKey: "rank",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-bold w-6 text-center">{item.rank}</span>
                        {getRankChangeIcon(item.rank, item.prev_rank)}
                    </div>
                )
            }
        },
        {
            header: "Student",
            accessorKey: "display_name",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div
                        className={`cursor-pointer hover:underline ${item.is_me ? "font-bold text-primary" : ""}`}
                        onClick={() => item.student_id && setSelectedStudentId(item.student_id)}
                    >
                        {item.display_name ?? "Anonymous"}
                        {item.is_me && <Badge variant="secondary" className="ml-2 text-[10px]">YOU</Badge>}
                    </div>
                )
            }
        },
        {
            header: "Score",
            accessorKey: "score",
            cell: ({ row }) => <ScoreBreakdown score={row.original.score} breakdown={row.original.breakdown} />
        },
        {
            header: "Return",
            accessorKey: "return_pct",
            cell: ({ row }) => (
                <span className={row.original.return_pct >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatPct(row.original.return_pct / 100)}
                </span>
            )
        },
        {
            header: "Equity",
            accessorKey: "equity",
            cell: ({ row }) => formatCurrency(row.original.equity)
        }
    ]

    if (isTeacher) {
        columns.push({
            header: "Penalties",
            accessorKey: "penalties",
            cell: ({ row }) => (
                <span className={row.original.penalties > 0 ? "text-red-500" : "text-muted-foreground"}>
                    {row.original.penalties.toFixed(2)}
                </span>
            )
        })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle>Competition Leaderboard</CardTitle>
                            <CardDescription>Real-time rankings based on risk-adjusted performance.</CardDescription>
                        </div>
                        {isTeacher && (
                            <div className="w-full md:w-[200px]">
                                <Select value={mode} onValueChange={setMode}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Scoring Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rules_compliance_weighted">Compliance Weighted</SelectItem>
                                        <SelectItem value="raw_return">Raw Return</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="rounded-md border overflow-x-auto">
                        <DataTable
                            data={data?.rankings ?? []}
                            columns={columns}
                            isLoading={isLoading}
                        />
                    </div>
                </CardContent>
            </Card>

            <Sheet open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
                <SheetContent className="sm:max-w-xl overflow-y-auto w-full">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Student Profile</SheetTitle>
                        <SheetDescription>Detailed performance analytics and history.</SheetDescription>
                    </SheetHeader>
                    {selectedStudentId && (
                        <StudentProfile
                            studentId={selectedStudentId}
                            ranking={data?.rankings.find(r => r.student_id === selectedStudentId)}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}

function getRankChangeIcon(current: number, prev: number) {
    if (prev === 0 || current === prev) return <Minus className="h-3 w-3 text-muted-foreground" />
    if (current < prev) return <TrendingUp className="h-3 w-3 text-green-500" />
    return <TrendingDown className="h-3 w-3 text-red-500" />
}
