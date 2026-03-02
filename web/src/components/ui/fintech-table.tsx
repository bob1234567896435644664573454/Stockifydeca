import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface Column<T> {
    header: string | React.ReactNode
    accessorKey?: keyof T
    cell?: (item: T) => React.ReactNode
    className?: string
    align?: "left" | "center" | "right"
}

interface FintechTableProps<T> {
    data: T[]
    columns: Column<T>[]
    isLoading?: boolean
    emptyMessage?: string
    className?: string
    onRowClick?: (item: T) => void
    compact?: boolean
}

export function FintechTable<T>({
    data,
    columns,
    isLoading,
    emptyMessage = "No data available",
    className,
    onRowClick,
    compact = false,
}: FintechTableProps<T>) {
    if (isLoading) {
        return (
            <div className={cn("rounded-md border overflow-hidden bg-background", className)}>
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                        <TableRow>
                            {columns.map((col, i) => (
                                <TableHead key={i} className={cn("h-10", col.className)}>
                                    <Skeleton className="h-4 w-24" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i} className="h-12 border-b">
                                {columns.map((_, j) => (
                                    <TableCell key={j}>
                                        <Skeleton className="h-4 w-full" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (!data?.length) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-64 border rounded-md bg-background/50 border-dashed animate-in fade-in-50", className)}>
                <div className="rounded-full bg-muted/50 p-4 mb-4">
                    <div className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-muted-foreground font-medium text-sm">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className={cn("rounded-md border overflow-auto relative bg-background", className)}>
            <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                    <TableRow className="hover:bg-transparent border-b-2 border-border/50">
                        {columns.map((col, i) => (
                            <TableHead
                                key={i}
                                className={cn(
                                    "px-4 font-semibold text-muted-foreground uppercase tracking-wider",
                                    compact ? "h-8 text-[10px]" : "h-10 text-xs",
                                    col.align === "right" && "text-right",
                                    col.align === "center" && "text-center",
                                    col.className
                                )}
                            >
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, i) => (
                        <TableRow
                            key={i}
                            className={cn(
                                "border-b transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted",
                                compact ? "h-8" : "h-12",
                                onRowClick && "cursor-pointer active:bg-muted/50"
                            )}
                            onClick={() => onRowClick && onRowClick(row)}
                        >
                            {columns.map((col, j) => (
                                <TableCell
                                    key={j}
                                    className={cn(
                                        "px-4 font-mono text-sm",
                                        compact && "py-1 text-xs",
                                        col.align === "right" && "text-right",
                                        col.align === "center" && "text-center",
                                        col.className
                                    )}
                                >
                                    {col.cell
                                        ? col.cell(row)
                                        : col.accessorKey
                                            ? (row[col.accessorKey] as React.ReactNode)
                                            : null}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
