import "@testing-library/jest-dom"

// Mock import.meta.env for tests
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_SB_URL: "https://test.supabase.co",
    VITE_SB_ANON_KEY: "test-anon-key",
    DEV: true,
    PROD: false,
    MODE: "test",
  },
})
