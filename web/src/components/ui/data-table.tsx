import * as React from "react"
import type {
    ColumnDef,
    SortingState,
} from "@tanstack/react-table"
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"

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

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    isLoading?: boolean
    emptyMessage?: string
    onRowClick?: (row: TData) => void
    compact?: boolean
    className?: string
    containerClassName?: string
}

export function DataTable<TData, TValue>({
    columns,
    data,
    isLoading,
    emptyMessage = "No results.",
    onRowClick,
    compact = false,
    className,
    containerClassName,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            sorting,
        },
    })

    // The scrollable container for virtualization
    const tableContainerRef = React.useRef<HTMLDivElement>(null)

    const { rows } = table.getRowModel()

    // Set up virtualization
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => (compact ? 32 : 48), // Height estimation
        overscan: 10,
    })

    if (isLoading) {
        return (
            <div className={cn("rounded-md border bg-background", containerClassName)}>
                <Table className={className}>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className={cn(compact ? "h-8" : "h-10")}>
                                            <Skeleton className="h-4 w-24" />
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i} className={cn("border-b", compact ? "h-8" : "h-12")}>
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

    const virtualRows = rowVirtualizer.getVirtualItems()
    const totalSize = rowVirtualizer.getTotalSize()

    const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
    const paddingBottom = virtualRows.length > 0
        ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
        : 0

    return (
        <div
            ref={tableContainerRef}
            className={cn(
                "rounded-md border bg-background overflow-auto relative max-h-[600px] scrollbar-thin",
                containerClassName
            )}
        >
            <Table className={className}>
                <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-2 border-border/50">
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "px-4 font-semibold text-muted-foreground uppercase tracking-wider",
                                            compact ? "h-8 text-[10px]" : "h-10 text-xs",
                                            header.column.getCanSort() && "cursor-pointer select-none hover:text-foreground"
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-1">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            {{
                                                asc: ' ↑',
                                                desc: ' ↓',
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {rows.length > 0 ? (
                        <>
                            {paddingTop > 0 && (
                                <TableRow>
                                    <TableCell colSpan={columns.length} style={{ height: `${paddingTop}px` }} />
                                </TableRow>
                            )}
                            {virtualRows.map((virtualRow) => {
                                const row = rows[virtualRow.index]
                                return (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={cn(
                                            "border-b transition-colors hover:bg-muted/30",
                                            compact ? "h-8" : "h-12",
                                            onRowClick && "cursor-pointer active:bg-muted/50"
                                        )}
                                        onClick={() => onRowClick && onRowClick(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn(
                                                    "px-4 font-mono text-sm",
                                                    compact && "py-1 text-xs"
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )
                            })}
                            {paddingBottom > 0 && (
                                <TableRow>
                                    <TableCell colSpan={columns.length} style={{ height: `${paddingBottom}px` }} />
                                </TableRow>
                            )}
                        </>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center animate-in fade-in-50">
                                    <div className="rounded-full bg-muted/50 p-4 mb-4">
                                        <div className="h-8 w-8 text-muted-foreground opacity-50" />
                                    </div>
                                    <p className="text-muted-foreground font-medium text-sm">{emptyMessage}</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
