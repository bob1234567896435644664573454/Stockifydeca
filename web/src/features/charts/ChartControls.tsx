
// import React from "react"
import { Button } from "@/components/ui/button"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import { Settings2, BarChart2 } from "lucide-react"

export type Timeframe = '1m' | '5m' | '1h' | '1d';

interface ChartControlsProps {
    timeframe: Timeframe;
    onTimeframeChange: (tf: Timeframe) => void;
    showVolume: boolean;
    onToggleVolume: (show: boolean) => void;
    showSMA: boolean;
    onToggleSMA: (show: boolean) => void;
    showEMA: boolean;
    onToggleEMA: (show: boolean) => void;
    showVWAP: boolean;
    onToggleVWAP: (show: boolean) => void;
    showRSI: boolean;
    onToggleRSI: (show: boolean) => void;
    mode: 'simple' | 'pro';
    onToggleMode: () => void;
}

export function ChartControls({
    timeframe,
    onTimeframeChange,
    showVolume,
    onToggleVolume,
    showSMA,
    onToggleSMA,
    showEMA,
    onToggleEMA,
    showVWAP,
    onToggleVWAP,
    showRSI,
    onToggleRSI,
    mode,
    onToggleMode
}: ChartControlsProps) {
    return (
        <div className="flex items-center gap-2 p-2 border-b bg-card overflow-x-auto w-full no-scrollbar">
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 shrink-0">
                {(['1m', '5m', '1h', '1d'] as Timeframe[]).map((tf) => (
                    <button
                        key={tf}
                        onClick={() => onTimeframeChange(tf)}
                        className={`text-xs px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap ${timeframe === tf
                            ? 'bg-background shadow-sm text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {tf.toUpperCase()}
                    </button>
                ))}
            </div>

            <Separator orientation="vertical" className="h-6 shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
                <Toggle
                    size="sm"
                    pressed={showVolume}
                    onPressedChange={onToggleVolume}
                    aria-label="Toggle Volume"
                    className="h-8 text-xs px-2.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                    Vol
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={showSMA}
                    onPressedChange={onToggleSMA}
                    aria-label="Toggle SMA"
                    className="h-8 text-xs px-2.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                    SMA
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={showEMA}
                    onPressedChange={onToggleEMA}
                    aria-label="Toggle EMA"
                    className="h-8 text-xs px-2.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                    EMA
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={showVWAP}
                    onPressedChange={onToggleVWAP}
                    aria-label="Toggle VWAP"
                    className="h-8 text-xs px-2.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                    VWAP
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={showRSI}
                    onPressedChange={onToggleRSI}
                    aria-label="Toggle RSI"
                    className="h-8 text-xs px-2.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                    RSI
                </Toggle>
            </div>

            <div className="flex-1 min-w-4" />

            <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMode}
                className="h-8 text-xs gap-2 shrink-0 whitespace-nowrap"
            >
                {mode === 'simple' ? <BarChart2 className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                {mode === 'simple' ? 'Pro Chart' : 'Simple'}
            </Button>
        </div>
    )
}
