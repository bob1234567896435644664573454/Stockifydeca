import { useEffect, useRef } from "react"

interface TradingViewWidgetProps {
    symbol: string
    theme?: "light" | "dark"
}

export function TradingViewWidget({ symbol, theme = "dark" }: TradingViewWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Clean up previous script
        containerRef.current.innerHTML = ""

        const script = document.createElement("script")
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
        script.type = "text/javascript"
        script.async = true
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: symbol,
            interval: "D",
            timezone: "Etc/UTC",
            theme: theme,
            style: "1",
            locale: "en",
            enable_publishing: false,
            withdateranges: true,
            hide_side_toolbar: false,
            allow_symbol_change: false, // We handle symbol change via parent
            details: true,
            hotlist: true,
            calendar: false,
            support_host: "https://www.tradingview.com",
        })

        containerRef.current.appendChild(script)
    }, [symbol, theme])

    return (
        <div className="h-full w-full relative" ref={containerRef}>
            {/* Widget injected here */}
        </div>
    )
}
