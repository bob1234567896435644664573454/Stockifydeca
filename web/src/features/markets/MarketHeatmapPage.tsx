import { useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Treemap, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Maximize2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

// Mock Hierarchical Data for the Heatmap
const MARKET_DATA = [
    {
        name: "Technology",
        children: [
            { name: "AAPL", size: 2800, change: 1.5, price: 175.50 },
            { name: "MSFT", size: 2900, change: 0.8, price: 405.20 },
            { name: "NVDA", size: 2200, change: 3.2, price: 850.10 },
            { name: "GOOGL", size: 1700, change: -1.2, price: 140.30 },
            { name: "META", size: 1200, change: 2.1, price: 485.00 },
            { name: "AVGO", size: 600, change: -0.5, price: 1300.20 },
        ],
    },
    {
        name: "Financials",
        children: [
            { name: "JPM", size: 500, change: 0.5, price: 190.50 },
            { name: "BAC", size: 280, change: -1.2, price: 35.20 },
            { name: "WFC", size: 200, change: 0.1, price: 55.10 },
            { name: "V", size: 550, change: 1.8, price: 280.90 },
            { name: "MA", size: 450, change: 1.2, price: 470.50 },
        ],
    },
    {
        name: "Healthcare",
        children: [
            { name: "UNH", size: 450, change: -2.5, price: 490.10 },
            { name: "JNJ", size: 380, change: -0.8, price: 155.30 },
            { name: "LLY", size: 550, change: 4.5, price: 780.20 },
            { name: "MRK", size: 290, change: 0.4, price: 125.80 },
        ],
    },
    {
        name: "Consumer Discretionary",
        children: [
            { name: "AMZN", size: 1800, change: 1.1, price: 178.50 },
            { name: "TSLA", size: 550, change: -3.5, price: 175.20 },
            { name: "HD", size: 350, change: 0.2, price: 360.10 },
            { name: "MCD", size: 210, change: -0.5, price: 285.40 },
        ],
    },
    {
        name: "Energy",
        children: [
            { name: "XOM", size: 400, change: 2.5, price: 110.50 },
            { name: "CVX", size: 300, change: 1.8, price: 155.20 },
            { name: "COP", size: 150, change: 3.1, price: 120.10 },
        ],
    }
]

// Interpolate color based on percentage change
const getColorForChange = (change: number) => {
    if (change > 3) return "hsl(var(--chart-up))" // strong green
    if (change > 0) return "hsla(var(--chart-up), 0.7)" // light green
    if (change === 0) return "hsl(var(--muted))" // neutral
    if (change > -3) return "hsla(var(--chart-down), 0.7)" // light red
    return "hsl(var(--chart-down))" // strong red
}

const CustomizedContent = (props: any) => {
    const { depth, x, y, width, height, name, change } = props;

    // Render nothing if it's too small
    if (width < 20 || height < 20) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={depth === 2 ? getColorForChange(change) : "transparent"}
                stroke={depth === 1 ? "hsl(var(--background))" : "hsl(var(--background))"}
                strokeWidth={depth === 1 ? 4 : 1}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
            />
            {
                depth === 1 && width > 50 && height > 30 ? (
                    <text
                        x={x + 4}
                        y={y + 18}
                        fill="hsl(var(--foreground))"
                        fontSize={14}
                        fontWeight="bold"
                        className="pointer-events-none drop-shadow-md mix-blend-difference text-white"
                    >
                        {name}
                    </text>
                ) : null
            }
            {
                depth === 2 && width > 40 && height > 30 ? (
                    <>
                        <text
                            x={x + width / 2}
                            y={y + height / 2 - 4}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={12}
                            fontWeight="bold"
                            className="pointer-events-none drop-shadow-sm"
                        >
                            {name}
                        </text>
                        {height > 45 && width > 45 && (
                            <text
                                x={x + width / 2}
                                y={y + height / 2 + 12}
                                textAnchor="middle"
                                fill="#fff"
                                fontSize={10}
                                fontWeight="500"
                                className="pointer-events-none drop-shadow-sm opacity-90"
                            >
                                {change > 0 ? "+" : ""}{change}%
                            </text>
                        )}
                    </>
                ) : null
            }
        </g>
    );
};

export function MarketHeatmapPage() {
    const [data, setData] = useState(MARKET_DATA)

    // Simulation to make it look alive occasionally
    const refreshData = () => {
        const newData = data.map(sector => ({
            ...sector,
            children: sector.children.map(stock => ({
                ...stock,
                change: Number((stock.change + (Math.random() - 0.5)).toFixed(2))
            }))
        }))
        setData(newData)
    }

    return (
        <AppShell role="student">
            <div className="p-4 md:p-8 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs uppercase tracking-wider">Markets</Badge>
                            <span className="text-muted-foreground text-sm">Live</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">S&P 500 Heatmap</h1>
                        <p className="text-muted-foreground mt-1">Market capitalization weighted performance grouped by sector.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={refreshData}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                            <Maximize2 className="mr-2 h-4 w-4" />
                            Fullscreen
                        </Button>
                    </div>
                </div>

                <Card className="border-border/50 glass animate-slide-up bg-card">
                    <CardHeader className="pb-2 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Sector Performance</CardTitle>
                            <div className="flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-3 w-3 rounded-sm bg-[hsl(var(--chart-down))]" /> &lt; -3%
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-3 w-3 rounded-sm bg-[hsla(var(--chart-down),0.7)]" /> -3% to 0%
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-3 w-3 rounded-sm bg-[hsl(var(--muted))]" /> 0%
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-3 w-3 rounded-sm bg-[hsla(var(--chart-up),0.7)]" /> 0% to 3%
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-3 w-3 rounded-sm bg-[hsl(var(--chart-up))]" /> &gt; 3%
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-1 sm:p-2">
                        <div className="h-[600px] w-full min-h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap
                                    width={400}
                                    height={200}
                                    data={data}
                                    dataKey="size"
                                    aspectRatio={4 / 3}
                                    stroke="#fff"
                                    content={<CustomizedContent />}
                                    isAnimationActive={false}
                                >
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                // Determine if it's a sector or stock
                                                if (data.children) return null; // Only show tooltip for stocks
                                                return (
                                                    <div className="glass bg-card/95 border shadow-xl rounded-lg p-3 min-w-[150px]">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-bold text-lg">{data.name}</span>
                                                            <span className={`font-semibold ${data.change >= 0 ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'}`}>
                                                                {data.change >= 0 ? '+' : ''}{data.change}%
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground mb-1">Price: <span className="text-foreground font-mono">{formatCurrency(data.price)}</span></div>
                                                        <div className="text-sm text-muted-foreground">Weight: <span className="text-foreground font-mono">{(data.size / 100).toFixed(2)}B</span></div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </Treemap>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    )
}
