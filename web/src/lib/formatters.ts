export const formatCurrency = (value: number | string | undefined | null, maximumSignificantDigits?: number) => {
    if (value === undefined || value === null) return "---"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "---"

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumSignificantDigits
    }).format(num)
}

export const formatPercent = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return "---"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "---"

    return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num / 100) // Assuming value is 1.5 for 1.5%
}

export const formatNumber = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return "---"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "---"

    return new Intl.NumberFormat("en-US").format(num)
}

export const formatVolume = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return "---"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "---"

    return Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(num);
}

export const formatPct = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return "---"
    const num = typeof value === "string" ? parseFloat(value) : value
    if (isNaN(num)) return "---"

    return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: "never"
    }).format(num) // Expects Decimal (0.015 for 1.5%) or maybe I should check usage?
    // LeaderboardPage uses item.return_pct / 100. So if return_pct is 1.5, passed .015.
}

export const formatCompactNumber = (number: number) => {
    return Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(number);
};

export const formatDate = (date: string | number | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    })
}
