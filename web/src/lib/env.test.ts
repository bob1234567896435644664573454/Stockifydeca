import { describe, it, expect } from "vitest"
import { isSchoolSafe, sanitize, createRateLimiter } from "./env"

describe("isSchoolSafe", () => {
  it("allows normal financial text", () => {
    expect(isSchoolSafe("Buy 10 shares of AAPL")).toBe(true)
    expect(isSchoolSafe("Portfolio allocation strategy")).toBe(true)
    expect(isSchoolSafe("Diversification reduces risk")).toBe(true)
  })

  it("blocks gambling references", () => {
    expect(isSchoolSafe("Let's gamble on this stock")).toBe(false)
    expect(isSchoolSafe("Place a bet on crypto")).toBe(false)
    expect(isSchoolSafe("I want to wager money")).toBe(false)
  })

  it("blocks real money references", () => {
    expect(isSchoolSafe("Cash out my winnings")).toBe(false)
    expect(isSchoolSafe("Withdraw real money")).toBe(false)
  })

  it("blocks inappropriate content", () => {
    expect(isSchoolSafe("nsfw content here")).toBe(false)
  })
})

describe("sanitize", () => {
  it("escapes HTML entities", () => {
    expect(sanitize("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
    )
  })

  it("escapes quotes", () => {
    expect(sanitize('He said "hello"')).toBe("He said &quot;hello&quot;")
  })

  it("leaves safe text unchanged", () => {
    expect(sanitize("Hello world 123")).toBe("Hello world 123")
  })
})

describe("createRateLimiter", () => {
  it("allows calls within limit", () => {
    const canCall = createRateLimiter(3, 1000)
    expect(canCall()).toBe(true)
    expect(canCall()).toBe(true)
    expect(canCall()).toBe(true)
  })

  it("blocks calls exceeding limit", () => {
    const canCall = createRateLimiter(2, 1000)
    expect(canCall()).toBe(true)
    expect(canCall()).toBe(true)
    expect(canCall()).toBe(false) // 3rd call blocked
  })
})
