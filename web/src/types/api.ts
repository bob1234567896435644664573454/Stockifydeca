export interface ApiErrorResponse {
    error: string
    details?: string
    hint?: string
    code?: string
}

export type ApiResponse<T> = T | ApiErrorResponse

export interface PaginationParams {
    page?: number
    limit?: number
    offset?: number
}

export interface PaginatedResponse<T> {
    data: T[]
    count: number
    page: number
    limit: number
}
