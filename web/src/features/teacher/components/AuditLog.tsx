import { useState } from "react"
import { useAuditLog, type AuditLog as AuditLogItem } from "../hooks"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, FileText, AlertTriangle, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"


export function AuditLog({ classId }: { classId: string }) {
    const { data: logs, isLoading } = useAuditLog(classId)
    const [searchQuery, setSearchQuery] = useState("")

    const filteredLogs = (logs || []).filter((log: AuditLogItem) =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const columns: ColumnDef<AuditLogItem, any>[] = [
        {
            header: "Time",
            accessorKey: "created_at",
            cell: ({ row }) => <span className="text-muted-foreground whitespace-nowrap">{format(new Date(row.original.created_at), "MMM d, HH:mm")}</span>
        },
        {
            header: "Severity",
            accessorKey: "severity",
            cell: ({ row }) => {
                const item = row.original;
                const variants = {
                    info: "default",
                    warning: "secondary",
                    critical: "destructive"
                } as const
                const icons = {
                    info: <FileText className="h-3 w-3 mr-1" />,
                    warning: <AlertTriangle className="h-3 w-3 mr-1" />,
                    critical: <ShieldCheck className="h-3 w-3 mr-1" />
                }
                return (
                    <Badge variant={variants[item.severity] || "outline"} className="flex w-fit items-center">
                        {icons[item.severity]} {item.severity}
                    </Badge>
                )
            }
        },
        {
            header: "Actor",
            accessorKey: "actor_name",
            cell: ({ row }) => <span className="font-medium">{row.original.actor_name}</span>
        },
        {
            header: "Action",
            accessorKey: "action",
        },
        {
            header: "Details",
            accessorKey: "details",
            cell: ({ row }) => <div className="w-1/3 min-w-[300px]"><span className="text-muted-foreground text-xs">{row.original.details}</span></div>
        }
    ]

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Audit Log</CardTitle>
                        <CardDescription>Track all sensitive actions within this class.</CardDescription>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs..."
                            className="pl-8 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <div className="rounded-md border overflow-x-auto">
                    <DataTable
                        data={filteredLogs}
                        columns={columns}
                        isLoading={isLoading}
                        emptyMessage="No audit logs found."
                    />
                </div>
            </CardContent>
        </Card>
    )
}
