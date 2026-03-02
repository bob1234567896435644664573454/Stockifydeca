import { useMarketStatus } from "../hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Wifi, WifiOff, Clock } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"

export function MarketStatusTile() {
    const { data: status, isLoading, isError } = useMarketStatus()
    const [isLive, setIsLive] = useState(false)

    useEffect(() => {
        const check = () => {
            if (!isLoading && !isError && status?.timestamp) {
                const live = Date.now() - new Date(status.timestamp).getTime() < 60000
                setIsLive(live)
            } else {
                setIsLive(false)
            }
        }

        const timeout = setTimeout(check, 0)
        const interval = setInterval(check, 10000)

        return () => {
            clearTimeout(timeout)
            clearInterval(interval)
        }
    }, [status?.timestamp, isLoading, isError])

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Market Data Feed
                </CardTitle>
                {isLive ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                    {isLoading ? "Connecting..." : isError ? "Error" : isLive ? "Live" : "Delayed"}
                    {isLive && <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {status ? `SPY $${status.price?.toFixed(2)}` : "No Data"}
                </div>
                {status?.timestamp && (
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last Update: {format(new Date(status.timestamp), "HH:mm:ss")}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
