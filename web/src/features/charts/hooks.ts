import { useQuery } from "@tanstack/react-query";
import { api, supabase } from "@/lib/api";
import { type Timeframe } from "./ChartControls";
import { useEffect, useState } from "react";

export interface OHLCBar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

interface ChartResponse {
    bars: OHLCBar[];
    meta: {
        tf: string;
        last_updated_at: string;
        stale: boolean;
    };
}

export function useChartData(symbol: string, timeframe: Timeframe, enabled = true) {
    return useQuery({
        queryKey: ["chart", symbol, timeframe],
        queryFn: async () => {
            const res = await api.get<ChartResponse>(`/charts/ohlc`, {
                symbol,
                tf: timeframe,
                limit: 1000
            });
            return res;
        },
        refetchInterval: 60000,
        staleTime: 5000,
        enabled: !!symbol && enabled,
    });
}

export function useRealtimeChart(symbol: string, enabled = true) {
    const [realtimeBar, setRealtimeBar] = useState<OHLCBar | null>(null);

    useEffect(() => {
        if (!symbol || !enabled) return;

        // Listen for new bars (aggregated 1m mainly, but let's assume we get 1m updates)
        // If we want tick-level updates, we'd need to listen to 'market_prices_latest' or trades
        const channel = supabase.channel(`chart-${symbol}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'market_bars_cache',
                    filter: `symbol=eq.${symbol}`
                },
                (payload) => {
                    const newBar = payload.new as { ts: string; o: number; h: number; l: number; c: number; v?: number };
                    // Format to match OHLCBar
                    setRealtimeBar({
                        time: Math.floor(new Date(newBar.ts).getTime() / 1000),
                        open: Number(newBar.o),
                        high: Number(newBar.h),
                        low: Number(newBar.l),
                        close: Number(newBar.c),
                        volume: Number(newBar.v)
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [symbol, enabled]);

    return realtimeBar;
}
