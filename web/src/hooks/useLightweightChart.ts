import { useEffect, useRef, useState } from "react"
import { createChart, CrosshairMode, AreaSeries, CandlestickSeries, LineSeries } from "lightweight-charts"
import type { IChartApi, ISeriesApi, DeepPartial, TimeScaleOptions } from "lightweight-charts"
import { useTheme } from "next-themes"

export type ChartSeriesType = "line" | "area" | "candlestick"

export interface ChartOptions {
    autoScale?: boolean
    hideLegend?: boolean
    height?: number
    colors?: {
        backgroundColor?: string
        textColor?: string
        upColor?: string
        downColor?: string
    }
}

export function useLightweightChart(
    containerRef: React.RefObject<HTMLDivElement | null>,
    seriesType: ChartSeriesType,
    data: any[],
    options?: ChartOptions
) {
    const { resolvedTheme } = useTheme()
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<any> | null>(null)
    const [tooltipData, setTooltipData] = useState<{ time: string, value: string } | null>(null)

    useEffect(() => {
        if (!containerRef.current || !data) return

        const isDark = resolvedTheme === "dark"
        const defaultBg = options?.colors?.backgroundColor || "transparent"
        const textColor = options?.colors?.textColor || (isDark ? "#d1d5db" : "#374151")
        const upColor = options?.colors?.upColor || "#10b981" // emerald-500
        const downColor = options?.colors?.downColor || "#ef4444" // red-500

        const handleResize = () => {
            if (chartRef.current && containerRef.current) {
                chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
            }
        }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: options?.height || 300,
            layout: {
                background: { type: 'solid' as any, color: defaultBg },
                textColor,
            },
            grid: {
                vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
            } as DeepPartial<TimeScaleOptions>,
        })
        chartRef.current = chart

        let series: ISeriesApi<any>

        switch (seriesType) {
            case "area":
                series = chart.addSeries(AreaSeries, {
                    lineColor: upColor,
                    topColor: upColor.replace(')', ', 0.4)').replace('rgb', 'rgba'),
                    bottomColor: upColor.replace(')', ', 0.0)').replace('rgb', 'rgba'),
                    lineWidth: 2,
                })
                break
            case "candlestick":
                series = chart.addSeries(CandlestickSeries, {
                    upColor: upColor,
                    downColor: downColor,
                    borderVisible: false,
                    wickUpColor: upColor,
                    wickDownColor: downColor,
                })
                break
            case "line":
            default:
                series = chart.addSeries(LineSeries, {
                    color: upColor,
                    lineWidth: 2,
                })
                break
        }

        seriesRef.current = series

        // Set Data
        if (data.length > 0) {
            series.setData(data)
            chart.timeScale().fitContent()
        }

        // Tooltip logic
        chart.subscribeCrosshairMove((param) => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > containerRef.current!.clientWidth ||
                param.point.y < 0 ||
                param.point.y > containerRef.current!.clientHeight
            ) {
                setTooltipData(null)
            } else {
                const dataPoint = param.seriesData.get(series)
                if (dataPoint) {
                    const val = 'value' in dataPoint ? dataPoint.value : 'close' in dataPoint ? dataPoint.close : 0
                    const timeStr = typeof param.time === 'string'
                        ? param.time
                        : typeof param.time === 'number'
                            ? new Date(param.time * 1000).toLocaleDateString()
                            : JSON.stringify(param.time)

                    setTooltipData({
                        time: timeStr,
                        value: Number(val).toFixed(2)
                    })
                }
            }
        })

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [containerRef, data, resolvedTheme, seriesType, options])

    return { chartRef, seriesRef, tooltipData }
}
