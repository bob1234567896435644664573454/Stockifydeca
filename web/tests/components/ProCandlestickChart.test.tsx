// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mock ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))
vi.stubGlobal('ResizeObserver', ResizeObserverMock)

describe('ProCandlestickChart', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
    })

    const initialData = [
        { time: '2023-01-01', open: 100, high: 110, low: 90, close: 105 },
        { time: '2023-01-02', open: 105, high: 115, low: 95, close: 110 },
    ] as any

    it('renders and cleans up', async () => {
        const { createChart: createChartSpy, chartMock } = await setupMocks()
        const { ProCandlestickChart } = await import('../../src/features/charts/ProCandlestickChart')

        const { unmount } = render(<ProCandlestickChart data={initialData} />)

        expect(createChartSpy).toHaveBeenCalled()
        expect(chartMock.addSeries).toHaveBeenCalled()

        unmount()
        expect(chartMock.remove).toHaveBeenCalled()
    })

    it('updates data incrementally', async () => {
        const { seriesMock } = await setupMocks()
        const { ProCandlestickChart } = await import('../../src/features/charts/ProCandlestickChart')

        const { rerender } = render(<ProCandlestickChart data={initialData} />)
        expect(seriesMock.setData).toHaveBeenCalledWith(initialData)

        // Update
        const newCandle = { time: '2023-01-03', open: 110, high: 120, low: 100, close: 115 } as any
        rerender(<ProCandlestickChart data={initialData} lastCandle={newCandle} />)

        expect(seriesMock.update).toHaveBeenCalledWith(newCandle)
        expect(seriesMock.setData).toHaveBeenCalledTimes(1)
    })
})

async function setupMocks() {
    const fn = vi.fn()
    const seriesMock = {
        setData: vi.fn(),
        update: vi.fn(),
        applyOptions: fn,
        setMarkers: fn,
        priceScale: () => ({ applyOptions: fn }),
    }

    const chartMock = {
        addSeries: vi.fn(() => seriesMock),
        removeSeries: fn,
        applyOptions: fn,
        subscribeCrosshairMove: fn,
        unsubscribeCrosshairMove: fn,
        remove: fn,
        priceScale: () => ({ applyOptions: fn }),
        timeScale: () => ({ fitContent: fn, applyOptions: fn }),
    }

    const createChartSpy = vi.fn(() => chartMock)

    vi.doMock('lightweight-charts', () => ({
        createChart: createChartSpy,
        ColorType: { Solid: 1 },
        CandlestickSeries: 'candles',
        HistogramSeries: 'hist',
        LineSeries: 'line',
        createSeriesMarkers: vi.fn(() => ({
            setMarkers: vi.fn(),
        })),
    }))

    vi.doMock('next-themes', () => ({
        useTheme: () => ({ theme: 'dark' }),
    }))

    return { createChart: createChartSpy, chartMock, seriesMock }
}
