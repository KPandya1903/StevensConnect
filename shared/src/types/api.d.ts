/**
 * Standard API response shapes.
 * All endpoints return one of these structures.
 */
export interface ApiSuccess<T> {
    data: T;
}
export interface ApiError {
    error: {
        message: string;
        code: string;
        fields?: Record<string, string>;
    };
}
export interface ApiPaginated<T> {
    data: T[];
    total: number;
    page: number;
    totalPages: number;
}
