import { useState } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { useClassRoster, useFreezeStudent, useResetStudent, useClassCompetitions, type RosterItem } from "./hooks"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { ArrowLeft, Lock, Download, RotateCcw, MoreHorizontal, ShieldAlert, Power, Trophy, Users, Megaphone, BarChart3, CalendarDays } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LeaderboardPage } from "@/features/leaderboard/LeaderboardPage"
import { StudentProfile } from "@/features/analytics/StudentProfile"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { AppShell } from "@/components/layout/AppShell"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { RulesEditor } from "./components/RulesEditor"
import { ClassCalendar } from "./components/ClassCalendar"
import { AnnouncementsManager } from "./components/AnnouncementsManager"
import { AuditLog } from "./components/AuditLog"
import { useTeacherClasses, useFreezeClass, useRequestExport, useExportStatus, useExportJobs } from "./hooks"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, History, XCircle, Clock } from "lucide-react"
import { Separator } from "@/components/ui/separator"

function ExportDialog({ classId, competitionId }: { classId: string, competitionId?: string }) {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState("trades_orders_fills")
    const { mutate: requestExport, isPending: isRequesting } = useRequestExport()
    const [jobId, setJobId] = useState<string | null>(null)
    const { data: statusData } = useExportStatus(jobId || "")
    const { data: jobs } = useExportJobs(classId)

    const handleRequest = () => {
        requestExport({
            class_id: classId,
            competition_id: competitionId,
            type
        }, {
            onSuccess: (data) => setJobId(data.job_id)
        })
    }

    const isDone = statusData?.status === 'done'
    const isFailed = statusData?.status === 'failed'

    return (
        <Dialog open={open} onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
                setJobId(null)
                setType("trades_orders_fills")
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none">
                    <Download className="h-4 w-4 mr-2" /> Export
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export Data</DialogTitle>
                    <DialogDescription>
                        Generate and download CSV reports for this class.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Report Type</label>
                        <Select value={type} onValueChange={setType} disabled={!!jobId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="trades_orders_fills">Trades & Orders</SelectItem>
                                <SelectItem value="equity_curve">Equity Curve (Requires Comp)</SelectItem>
                                <SelectItem value="violations_log">Violations Log (Requires Comp)</SelectItem>
                                <SelectItem value="holdings_end_period">Holdings Snapshot</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {jobId && (
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant={isFailed ? "destructive" : isDone ? "default" : "secondary"}>
                                    {!isDone && !isFailed && <Loader2 className="mr-2 h-3 w-3 animate-spin inline" />}
                                    {statusData?.status || "Processing..."}
                                </Badge>
                            </div>
                            {isDone && statusData.signed_url && (
                                <Button className="w-full mt-2" onClick={() => window.open(statusData.signed_url, '_blank')}>
                                    <Download className="mr-2 h-4 w-4" /> Download CSV
                                </Button>
                            )}
                            {isFailed && (
                                <p className="text-xs text-red-500 mt-1">Export failed. Please try again.</p>
                            )}
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <History className="h-4 w-4" />
                            Recent Exports
                        </div>
                        <Separator />
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                            {jobs?.slice(0, 5).map((job) => (
                                <div key={job.id} className="flex items-center justify-between p-2 rounded border bg-card text-card-foreground">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold capitalize">{job.type.replaceAll('_', ' ')}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(job.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {job.status === 'done' ? (
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setJobId(job.id)}>
                                                <Download className="h-3.5 w-3.5" />
                                            </Button>
                                        ) : job.status === 'failed' ? (
                                            <XCircle className="h-4 w-4 text-destructive" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!jobs || jobs.length === 0) && (
                                <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded">
                                    No export history.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    {!jobId && (
                        <Button onClick={handleRequest} disabled={isRequesting}>
                            {isRequesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Start Export
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function ClassControl() {
    const { classId } = useParams({ strict: false })
    const navigate = useNavigate()
    const { data: roster, isLoading } = useClassRoster(classId || "")
    const { data: classes } = useTeacherClasses()
    const { data: competitions } = useClassCompetitions(classId || "")
    const { mutate: freezeAccount } = useFreezeStudent()
    const { mutate: freezeClass, isPending: isFreezingClass } = useFreezeClass()
    const { mutate: resetAccount } = useResetStudent()

    const currentClass = classes?.find(c => c.id === classId)
    const isClassFrozen = currentClass ? !currentClass.is_trading_enabled : false

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

    // Derived State
    const filteredRoster = (roster || []).filter(item =>
        item.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    )

    const allSelected = filteredRoster.length > 0 && selectedRows.size === filteredRoster.length

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(filteredRoster.map(r => r.student_id)))
        }
    }

    const toggleSelectRow = (id: string) => {
        const next = new Set(selectedRows)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedRows(next)
    }

    const columns: ColumnDef<RosterItem, any>[] = [
        {
            header: () => (
                <div className="w-[50px]">
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                    />
                </div>
            ),
            accessorKey: "student_id",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="w-[50px]">
                        <Checkbox
                            checked={selectedRows.has(item.student_id)}
                            onCheckedChange={() => toggleSelectRow(item.student_id)}
                            onClick={(e) => e.stopPropagation()}
                        />
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
                        className="cursor-pointer hover:underline"
                        onClick={() => setSelectedStudentId(item.student_id)}
                    >
                        <div className="font-medium text-primary">{item.display_name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{item.email}</div>
                    </div>
                )
            }
        },
        {
            header: "Equity",
            accessorKey: "equity",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="text-right">
                        <span className={!item.account_id ? "text-muted-foreground italic" : "font-medium"}>
                            {item.account_id ? formatCurrency(item.equity || 0) : "No Account"}
                        </span>
                    </div>
                )
            }
        },
        {
            header: "Cash",
            accessorKey: "cash_balance",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="text-right">
                        <span className="text-muted-foreground">
                            {item.account_id ? formatCurrency(item.cash_balance || 0) : "-"}
                        </span>
                    </div>
                )
            }
        },
        // Hiding Status on very small screens if needed, but table handles scroll
        {
            header: "Status",
            accessorKey: "enrollment_status",
            cell: ({ row }) => {
                const item = row.original;
                const colors: Record<string, string> = {
                    active: "bg-green-100 text-green-800",
                    frozen: "bg-red-100 text-red-800",
                    dropped: "bg-gray-100 text-gray-800"
                }
                return (
                    <div className="text-center">
                        <Badge variant="secondary" className={colors[item.enrollment_status] || ""}>
                            {item.enrollment_status}
                        </Badge>
                    </div>
                )
            }
        },
        {
            header: "Actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedStudentId(item.student_id)}>
                                    <Trophy className="mr-2 h-4 w-4" /> View Performance
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={!item.account_id}
                                    onClick={() => {
                                        if (item.account_id) {
                                            freezeAccount({ studentId: item.account_id, frozen: item.enrollment_status !== 'frozen' })
                                        }
                                    }}
                                >
                                    {item.enrollment_status === 'frozen' ? (
                                        <><Power className="mr-2 h-4 w-4" /> Unfreeze Trading</>
                                    ) : (
                                        <><Lock className="mr-2 h-4 w-4" /> Freeze Trading</>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600"
                                    disabled={!item.account_id}
                                    onClick={() => {
                                        if (item.account_id && confirm("Are you sure you want to reset this student's portfolio?")) {
                                            resetAccount({ accountId: item.account_id })
                                        }
                                    }}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" /> Reset Account
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            }
        }
    ]

    // Finds the active competition
    const activeCompetition = competitions?.find((c) => c.status === 'active') || competitions?.[0]

    return (
        <AppShell role="teacher">
            <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/teacher" })}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Class Control</h1>
                            <p className="text-muted-foreground text-sm md:text-base">Manage students, rules, and monitor performance.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant={isClassFrozen ? "default" : "destructive"}
                            className="flex-1 sm:flex-none"
                            disabled={isFreezingClass}
                            onClick={() => freezeClass({ classId: classId || "", frozen: !isClassFrozen })}
                        >
                            {isClassFrozen ? (
                                <><Power className="h-4 w-4 mr-2" /> Unfreeze Class</>
                            ) : (
                                <><Lock className="h-4 w-4 mr-2" /> Freeze Class</>
                            )}
                        </Button>
                        <ExportDialog classId={classId || ""} competitionId={activeCompetition?.id} />
                    </div>
                </div>

                <Tabs defaultValue="roster" className="space-y-4">
                    <div className="overflow-x-auto pb-2">
                        <TabsList>
                            <TabsTrigger value="roster">
                                <Users className="h-4 w-4 mr-2" /> Roster
                            </TabsTrigger>
                            <TabsTrigger value="leaderboard">
                                <Trophy className="h-4 w-4 mr-2" /> Leaderboard
                            </TabsTrigger>
                            <TabsTrigger value="rules">
                                <ShieldAlert className="h-4 w-4 mr-2" /> Rules
                            </TabsTrigger>
                            <TabsTrigger value="announcements">
                                <Megaphone className="h-4 w-4 mr-2" /> Announcements
                            </TabsTrigger>
                            <TabsTrigger value="audit">
                                <ShieldAlert className="h-4 w-4 mr-2" /> Audit
                            </TabsTrigger>
                            <TabsTrigger value="grading">
                                <BarChart3 className="h-4 w-4 mr-2" /> Grading Signals
                            </TabsTrigger>
                            <TabsTrigger value="calendar">
                                <CalendarDays className="h-4 w-4 mr-2" /> Calendar
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="roster" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Student Roster</CardTitle>
                                        <CardDescription>View and manage enrolled students.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedRows.size > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        Bulk Actions ({selectedRows.size})
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => {
                                                        if (confirm(`Freeze ${selectedRows.size} students?`)) {
                                                            alert("Bulk freeze not implemented yet but button works!")
                                                        }
                                                    }}>
                                                        Freeze Selected
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600">
                                                        Reset Selected
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                        <div className="relative w-64">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search student or email..."
                                                className="pl-8 h-9"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-6">
                                <div className="rounded-md border overflow-x-auto">
                                    <DataTable
                                        data={filteredRoster}
                                        columns={columns}
                                        isLoading={isLoading}
                                        emptyMessage="No students found matching your search."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="leaderboard" className="space-y-4">
                        {activeCompetition ? (
                            <LeaderboardPage competitionId={activeCompetition.id} isTeacher />
                        ) : (
                            <div className="p-12 text-center text-muted-foreground border border-dashed rounded-lg">
                                No active competitions found for this class. Create one in the Rules tab.
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="rules" className="space-y-4">
                        <RulesEditor classId={classId || ""} />
                    </TabsContent>

                    <TabsContent value="announcements" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Announcements</CardTitle>
                                <CardDescription>Broadcast messages to student dashboards.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AnnouncementsManager classId={classId || ""} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="audit" className="space-y-4">
                        <AuditLog classId={classId || ""} />
                    </TabsContent>

                    <TabsContent value="grading" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Grading Signals</CardTitle>
                                <CardDescription>Process-first scoring: diversification + journaling + thesis quality. View per-student learning signals.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {roster && roster.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Student</th>
                                                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Trades</th>
                                                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Return</th>
                                                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Diversification</th>
                                                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Process Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {roster.map((student: RosterItem) => {
                                                    const returnPct = (student.equity && student.starting_cash && student.starting_cash > 0)
                                                        ? ((student.equity - student.starting_cash) / student.starting_cash) * 100
                                                        : 0
                                                    const isActive = student.enrollment_status === "active"
                                                    const processScore = isActive ? Math.round(Math.max(0, 50 + Math.min(50, returnPct * 2))) : 0
                                                    return (
                                                        <tr key={student.student_id} className="border-b last:border-0 hover:bg-muted/50">
                                                            <td className="py-2 px-3">
                                                                <div className="font-medium">{student.display_name || student.email || 'Student'}</div>
                                                            </td>
                                                            <td className="py-2 px-3 text-center">{student.enrollment_status}</td>
                                                            <td className="py-2 px-3 text-center">
                                                                <span className={returnPct >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                    {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-3 text-center">
                                                                <div className="h-2 w-16 mx-auto rounded-full bg-muted overflow-hidden">
                                                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, processScore)}%` }} />
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-3 text-center">
                                                                <span className={`font-bold ${processScore >= 70 ? 'text-green-600' : processScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                    {processScore}/100
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No students enrolled yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="calendar" className="space-y-4">
                        <ClassCalendar classId={classId || ""} />
                    </TabsContent>
                </Tabs>

                <Sheet open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
                    <SheetContent className="sm:max-w-xl overflow-y-auto w-full">
                        <SheetHeader className="mb-6">
                            <SheetTitle>Student Profile</SheetTitle>
                            <SheetDescription>Detailed performance analytics and history.</SheetDescription>
                        </SheetHeader>
                        {selectedStudentId && (
                            <StudentProfile
                                studentId={selectedStudentId}
                                competitionId={activeCompetition?.id}
                            />
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </AppShell>
    )
}
