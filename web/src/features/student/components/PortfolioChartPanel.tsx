import { useRef, useMemo } from "react"
import { useLightweightChart } from "@/hooks/useLightweightChart"
import { formatCurrency } from "@/lib/utils"

interface PortfolioChartPanelProps {
    data: { date: string; equity: number }[] | undefined
    timeframe: string
    onTimeframeChange: (tf: "1D" | "1W" | "1M" | "ALL") => void
}

export function PortfolioChartPanel({ data, timeframe, onTimeframeChange }: PortfolioChartPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Convert data to lightweight-charts format
    const chartData = useMemo(() => {
        if (!data) return []
        return data.map(d => {
            // lightweight-charts needs time as string "YYYY-MM-DD" or unix timestamp
            const t = new Date(d.date).getTime() / 1000
            return {
                time: t as any,
                value: d.equity
            }
        }).sort((a, b) => (a.time as number) - (b.time as number))
    }, [data])

    const { tooltipData } = useLightweightChart(containerRef, "area", chartData, {
        height: 240,
        autoScale: true,
    })


    const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0

    return (
        <div className="flex flex-col w-full h-full relative">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 relative z-10">
                <div className="flex items-center gap-1">
                    {(["1D", "1W", "1M", "ALL"] as const).map(tf => (
                        <button
                            key={tf}
                            onClick={() => onTimeframeChange(tf)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${timeframe === tf
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
                {tooltipData ? (
                    <div className="text-right pointer-events-none">
                        <div className="text-lg font-bold tracking-tight stat-number">{formatCurrency(parseFloat(tooltipData.value))}</div>
                        <div className="text-xs text-muted-foreground font-medium">{tooltipData.time}</div>
                    </div>
                ) : (
                    <div className="text-right pointer-events-none opacity-0 transition-opacity duration-300">
                        <div className="text-lg font-bold tracking-tight stat-number">{formatCurrency(latestValue)}</div>
                        <div className="text-xs text-muted-foreground font-medium">--</div>
                    </div>
                )}
            </div>

            {chartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[240px]">
                    No portfolio data available for this timeframe
                </div>
            ) : (
                <div
                    ref={containerRef}
                    className="w-full flex-1 min-h-[240px] [&_.tv-lightweight-charts]:mx-auto cursor-crosshair"
                />
            )}
        </div>
    )
}
