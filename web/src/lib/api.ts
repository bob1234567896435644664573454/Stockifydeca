import { createClient } from "@supabase/supabase-js"
import { type ZodSchema } from "zod"
import type { ApiErrorResponse } from "../types/api"

const SUPABASE_URL = import.meta.env.VITE_SB_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SB_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase env vars")
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export { type ApiErrorResponse } from "../types/api"

type QueryParams = Record<string, string | number | boolean | null | undefined>

class ApiClient {
    private static instance: ApiClient

    private constructor() { }

    public static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient()
        }
        return ApiClient.instance
    }

    private async getHeaders(): Promise<Headers> {
        const headers = new Headers()
        headers.set("apikey", SUPABASE_ANON_KEY)
        headers.set("Content-Type", "application/json")

        // Always get fresh session to ensure token is valid/refreshed
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
            headers.set("Authorization", `Bearer ${session.access_token}`)
        }

        return headers
    }

    public async get<T>(path: string, params?: QueryParams): Promise<T> {
        return this.request<T>(path, { method: "GET" }, params)
    }

    public async post<T, B = unknown>(path: string, body?: B): Promise<T> {
        return this.request<T>(path, {
            method: "POST",
            body: JSON.stringify(body)
        })
    }

    private async request<T>(path: string, options: RequestInit, params?: QueryParams): Promise<T> {
        const headers = await this.getHeaders()

        let url = `${SUPABASE_URL}/functions/v1${path}`
        if (params) {
            const searchParams = new URLSearchParams()
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value))
                }
            })
            url += `?${searchParams.toString()}`
        }

        const response = await fetch(url, {
            ...options,
            headers,
        })

        if (response.status === 401) {
            // Check if we actually have a session. Intermittent Edge Function 401s 
            // shouldn't purge the whole UI session if the token is still conceptually valid.
            const { data: { session } } = await supabase.auth.getSession()
            if (!session && !window.location.pathname.startsWith("/auth")) {
                window.location.href = "/auth"
            }
            throw new Error("Unauthorized")
        }

        if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.")
        }

        if (!response.ok) {
            let errorData: ApiErrorResponse = { error: response.statusText }
            try {
                const data = await response.json()
                if (data && typeof data === 'object') {
                    errorData = data as ApiErrorResponse
                }
            } catch {
                // Ignore json parse error
            }
            // Throw the cleanest message possible for UI 
            throw new Error(errorData.error || "An unexpected error occurred")
        }

        if (response.status === 204) {
            // Cast empty object as T for void responses, though techincally T should be void or unknown
            return {} as T
        }

        return response.json()
    }
    public async getParsed<T>(path: string, schema: ZodSchema<T>, params?: QueryParams): Promise<T> {
        return this.requestParsed<T>(path, schema, { method: "GET" }, params)
    }

    public async postParsed<T, B = unknown>(path: string, schema: ZodSchema<T>, body?: B): Promise<T> {
        return this.requestParsed<T>(path, schema, {
            method: "POST",
            body: JSON.stringify(body)
        })
    }

    private async requestParsed<T>(path: string, schema: ZodSchema<T>, options: RequestInit, params?: QueryParams): Promise<T> {
        const data = await this.request<unknown>(path, options, params)
        const result = schema.safeParse(data)

        if (!result.success) {
            if (import.meta.env.DEV) {
                console.error("API validation failed", {
                    path,
                    issues: result.error.issues,
                })
            }
            throw new Error("Invalid API response format")
        }

        return result.data
    }
}

export const api = ApiClient.getInstance()
