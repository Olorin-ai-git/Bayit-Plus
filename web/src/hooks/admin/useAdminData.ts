import { useState, useEffect, useCallback } from 'react'
import logger from '@/utils/logger'

interface UseAdminDataOptions<T> {
  fetchFn: (params: any) => Promise<{ items: T[]; total: number }>
  initialFilters?: Record<string, any>
  pageSize?: number
}

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function useAdminData<T>({
  fetchFn,
  initialFilters = {},
  pageSize = 20,
}: UseAdminDataOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState(initialFilters)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = {
        ...filters,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }

      const response = await fetchFn(params)

      setItems(response.items)
      setPagination((prev) => ({
        ...prev,
        total: response.total,
        totalPages: Math.ceil(response.total / prev.pageSize),
      }))

      logger.info('Admin data fetched successfully', {
        itemCount: response.items.length,
        total: response.total,
        page: pagination.page,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)
      logger.error('Failed to fetch admin data', { error: err })
    } finally {
      setLoading(false)
    }
  }, [fetchFn, filters, pagination.page, pagination.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }, [])

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to first page
  }, [])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    items,
    loading,
    error,
    pagination,
    filters,
    setPage,
    setFilters: updateFilters,
    refresh,
  }
}
