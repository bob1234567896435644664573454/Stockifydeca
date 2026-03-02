import { test, expect } from '@playwright/test'

test('trade placement keeps portfolio refetches bounded', async ({ page }) => {
    const counts = {
        place: 0,
        positions: 0,
        orders: 0,
        equity: 0,
    }

    const now = new Date().toISOString()

    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
        await route.fulfill({
            json: {
                access_token: 'mock_access_token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'mock_refresh_token',
                user: {
                    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'student1@stockify.dev',
                    app_metadata: { provider: 'email', providers: ['email'], role: 'student' },
                    user_metadata: { display_name: 'Alex Student' },
                    created_at: now,
                    updated_at: now,
                },
            },
        })
    })

    await page.route('**/rest/v1/trading_accounts*', async (route) => {
        await route.fulfill({
            json: {
                id: '44444444-4444-4444-4444-444444444441',
                user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                class_id: '33333333-3333-3333-3333-333333333333',
                cash_balance: 100000,
                starting_cash: 100000,
                created_at: now,
                updated_at: now,
            },
        })
    })

    await page.route('**/rest/v1/rpc/is_account_trading_enabled', async (route) => {
        await route.fulfill({ json: true })
    })

    await page.route('**/rest/v1/competition_accounts*', async (route) => {
        await route.fulfill({
            json: [{
                competition_id: '55555555-5555-5555-5555-555555555555',
                competitions: {
                    id: '55555555-5555-5555-5555-555555555555',
                    class_id: '33333333-3333-3333-3333-333333333333',
                    status: 'active',
                    name: 'Spring Trading Challenge',
                    rules_json: {
                        fee_model: { bps: 10 },
                        slippage_model: { bps: 5 },
                    },
                    created_at: now,
                    updated_at: now,
                },
            }],
        })
    })

    await page.route('**/functions/v1/charts/context*', async (route) => {
        await route.fulfill({
            json: {
                symbol: 'AAPL',
                previous_close: 189,
                market_status: 'open',
                last_price: 190,
                price: 190,
                change: 1,
                change_percent: 0.53,
                rules: {
                    fee_model: { bps: 10 },
                    slippage_model: { bps: 5 },
                },
                competition_id: '55555555-5555-5555-5555-555555555555',
                exchange: 'US',
                trading_enabled: true,
                position: { qty: 0, avg_cost: 0 },
                candles: [],
            },
        })
    })

    await page.route('**/functions/v1/charts/ohlc*', async (route) => {
        await route.fulfill({
            json: {
                bars: [{
                    time: Math.floor(Date.now() / 1000),
                    open: 189,
                    high: 191,
                    low: 188,
                    close: 190,
                    volume: 1000,
                }],
                meta: {
                    tf: '1m',
                    last_updated_at: now,
                    stale: false,
                },
            },
        })
    })

    await page.route('**/functions/v1/trade/positions*', async (route) => {
        counts.positions += 1
        await route.fulfill({
            json: {
                items: [{ symbol: 'AAPL', qty: 0, avg_cost: 0, realized_pnl: 0 }],
                page_size: 100,
                offset: 0,
            },
        })
    })

    await page.route('**/functions/v1/trade/orders*', async (route) => {
        counts.orders += 1
        await route.fulfill({
            json: {
                items: [],
                page_size: 50,
                offset: 0,
            },
        })
    })

    await page.route('**/functions/v1/trade/equity*', async (route) => {
        counts.equity += 1
        await route.fulfill({ json: { equity: 100000 } })
    })

    await page.route('**/functions/v1/trade/place', async (route) => {
        counts.place += 1
        await route.fulfill({ json: { result: { order_id: 'order-1', status: 'open', idempotent: false } } })
    })

    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', 'student1@stockify.dev')
    await page.fill('input[type="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/student/)

    await page.goto('/student/trade/AAPL')
    await expect(page.getByText('Order Ticket')).toBeVisible()

    await page.locator('input[type="number"]').first().fill('1')
    const reviewButton = page.getByRole('button', { name: 'Review Order' })
    await expect(reviewButton).toBeEnabled()
    await reviewButton.click()
    await expect(page.getByRole('heading', { name: 'Confirm Order' })).toBeVisible()
    const placeRequestPromise = page.waitForRequest('**/functions/v1/trade/place')
    await page.getByRole('button', { name: 'Confirm Order' }).last().click({ force: true })
    await placeRequestPromise
    await page.waitForTimeout(300)

    expect(counts.place).toBe(1)
    expect(counts.positions).toBeLessThanOrEqual(2)
    expect(counts.orders).toBeLessThanOrEqual(1)
    expect(counts.equity).toBeLessThanOrEqual(1)
})
