
export function calculateSMA(data: number[], period: number): number[] {
    const sma = new Array(data.length).fill(NaN);
    if (data.length < period) return sma;

    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    sma[period - 1] = sum / period;

    for (let i = period; i < data.length; i++) {
        sum = sum - data[i - period] + data[i];
        sma[i] = sum / period;
    }
    return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
    const ema = new Array(data.length).fill(NaN);
    if (data.length < period) return ema;

    const k = 2 / (period + 1);

    // Initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    ema[period - 1] = sum / period;

    for (let i = period; i < data.length; i++) {
        ema[i] = data[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
    const rsi = new Array(data.length).fill(NaN);
    if (data.length <= period) return rsi;

    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i <= period; i++) {
        const change = data[i] - data[i - 1];
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    if (avgLoss === 0) rsi[period] = 100;
    else {
        const rs = avgGain / avgLoss;
        rsi[period] = 100 - (100 / (1 + rs));
    }

    for (let i = period + 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        let gain = 0;
        let loss = 0;
        if (change > 0) gain = change;
        else loss = Math.abs(change);

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        if (avgLoss === 0) rsi[i] = 100;
        else {
            const rs = avgGain / avgLoss;
            rsi[i] = 100 - (100 / (1 + rs));
        }
    }
    return rsi;
}

export function calculateMACD(data: number[], fastPeriod = 12, slowPeriod = 26) {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);

    // Return histogram or simplified structure? For now just signal line or MACD line? 
    // Usually MACD needs multiple series. We will return just the MACD line for this simple chart.
    return macdLine;
}

export function calculateVWAP(data: { high: number, low: number, close: number, volume: number }[]): number[] {
    let cumVolume = 0;
    let cumPV = 0;
    return data.map(bar => {
        const typicalPrice = (bar.high + bar.low + bar.close) / 3;
        const pv = typicalPrice * bar.volume;
        cumVolume += bar.volume;
        cumPV += pv;
        return cumPV / cumVolume;
    });
}
