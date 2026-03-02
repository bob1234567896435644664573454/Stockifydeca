import React, { useEffect, useRef } from "react"
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, createSeriesMarkers } from "lightweight-charts"
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, Time, SeriesMarker, LineData, MouseEventParams, ISeriesMarkersPluginApi, LineWidth } from "lightweight-charts"
import { useTheme } from "next-themes"
import { formatVolume } from "@/lib/utils"

interface IndicatorSeries {
    data: LineData[];
    color: string;
    title?: string;
    lineWidth?: LineWidth;
    priceScaleId?: string;
    scaleMargins?: { top: number; bottom: number };
}

interface ProCandlestickChartProps {
    data: CandlestickData[];
    lastCandle?: CandlestickData;
    volume?: HistogramData[];
    indicators?: IndicatorSeries[];
    markers?: SeriesMarker<Time>[];
    colors?: {
        upColor?: string;
        downColor?: string;
        wickUpColor?: string;
        wickDownColor?: string;
    };
    height?: number;
    autoSize?: boolean;
    onCrosshairMove?: (data: CandlestickData | undefined) => void;
}

export const ProCandlestickChart = React.forwardRef<IChartApi | null, ProCandlestickChartProps>(({
    data,
    volume,
    lastCandle,
    indicators = [],
    markers = [],
    colors = {
        upColor: '#26a69a',
        downColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    },
    height = 500,
    autoSize = true,
    onCrosshairMove
}, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const indicatorsRef = useRef<ISeriesApi<"Line">[]>([]);
    const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

    const { theme } = useTheme();

    const isDark = theme === 'dark';
    const backgroundColor = isDark ? '#020817' : '#ffffff'; // card background or plain white
    const textColor = isDark ? '#94a3b8' : '#333333';
    const gridColor = isDark ? '#1e293b' : '#f0f0f0'; // slate-800 or light gray

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            width: chartContainerRef.current.clientWidth,
            height,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        // Expose via ref if needed
        if (typeof ref === 'function') {
            ref(chart);
        } else if (ref) {
            ref.current = chart;
        }

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: colors.upColor,
            downColor: colors.downColor,
            borderVisible: false,
            wickUpColor: colors.wickUpColor,
            wickDownColor: colors.wickDownColor,
        });
        candleSeriesRef.current = candleSeries;

        // Initialize markers plugin
        const markersPlugin = createSeriesMarkers(candleSeries, []);
        markersPluginRef.current = markersPlugin;

        // Volume
        if (volume) {
            const volSeries = chart.addSeries(HistogramSeries, {
                priceFormat: {
                    type: 'custom',
                    minMove: 0.01,
                    formatter: (value: number) => value !== undefined ? formatVolume(value) : '',
                },
                priceScaleId: '',
            });
            volSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });
            volumeSeriesRef.current = volSeries;
        }

        if (autoSize) {
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (autoSize) {
                window.removeEventListener('resize', handleResize);
            }
            chart.remove();
        };
    }, [
        autoSize,
        backgroundColor,
        colors.downColor,
        colors.upColor,
        colors.wickDownColor,
        colors.wickUpColor,
        gridColor,
        height,
        ref,
        textColor,
        volume
    ]);

    // Update Theme
    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
        });
    }, [isDark, backgroundColor, textColor, gridColor]);

    // Update Data
    useEffect(() => {
        if (!candleSeriesRef.current) return;
        candleSeriesRef.current.setData(data);
    }, [data]);

    // Incremental Updates
    useEffect(() => {
        if (!candleSeriesRef.current || !lastCandle) return;
        candleSeriesRef.current.update(lastCandle);
    }, [lastCandle]);

    useEffect(() => {
        if (!volumeSeriesRef.current) return;
        // If volume prop toggles from undefined to defined, we might need to add series differently.
        // For simplicity, we assume series is added on mount if volume prop "exists" or we could handle dynamic add/remove.
        // Here we just setData if series exists.
        if (volume) volumeSeriesRef.current.setData(volume);
    }, [volume]);

    // Update Indicators
    useEffect(() => {
        if (!chartRef.current) return;

        // Clean up old indicators
        indicatorsRef.current.forEach(series => chartRef.current?.removeSeries(series));
        indicatorsRef.current = [];

        // Add new indicators
        indicators.forEach(ind => {
            const series = chartRef.current!.addSeries(LineSeries, {
                color: ind.color,
                lineWidth: ind.lineWidth || 1,
                title: ind.title,
                priceScaleId: ind.priceScaleId || 'right',
            });

            if (ind.priceScaleId && ind.priceScaleId !== 'right' && ind.priceScaleId !== 'left') {
                chartRef.current?.priceScale(ind.priceScaleId).applyOptions({
                    scaleMargins: ind.scaleMargins || { top: 0.1, bottom: 0.1 },
                    visible: true // Maybe false if we don't want axis labels?
                });
            }

            series.setData(ind.data);
            indicatorsRef.current.push(series);
        });

    }, [indicators]);

    useEffect(() => {
        if (!markersPluginRef.current) return;
        markersPluginRef.current.setMarkers(markers);
    }, [markers]);

    // Crosshair Handler
    useEffect(() => {
        if (!chartRef.current || !candleSeriesRef.current) return;

        const handleCrosshairMove = (param: MouseEventParams) => {
            if (!candleSeriesRef.current) return;

            if (!param.time || param.point === undefined || param.point.x < 0 || param.point.x > chartContainerRef.current!.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current!.clientHeight) {
                if (onCrosshairMove) onCrosshairMove(undefined);
                return;
            }

            const seriesData = param.seriesData.get(candleSeriesRef.current);
            if (onCrosshairMove && seriesData) {
                onCrosshairMove(seriesData as CandlestickData);
            }
        };

        chartRef.current.subscribeCrosshairMove(handleCrosshairMove);

        return () => {
            chartRef.current?.unsubscribeCrosshairMove(handleCrosshairMove);
        };
    }, [onCrosshairMove]);

    return (
        <div ref={chartContainerRef} className="w-full relative" style={{ height }} />
    );
});

ProCandlestickChart.displayName = "ProCandlestickChart";
