/**
 * TableColumns - Column definitions for hierarchical content table
 * Separates column configuration logic from main component
 */

import { useMemo } from 'react'
import { GlassTableColumn } from '@bayit/shared/ui/web'
import type { Episode } from './TreeRow'
import { SelectionHeader } from './TreeActions'
import {
  renderExpandCell,
  renderThumbnailCell,
  renderTitleCell,
  renderCategoryCell,
  renderYearCell,
  renderSubtitlesCell,
  renderStatusCell,
  renderActionsCell,
  renderSelectionCell,
  type TableRow,
} from './ColumnRenderers'

interface UseTableColumnsOptions {
  t: (key: string, options?: any) => string
  isRTL: boolean
  expandedSeries: Set<string>
  episodeCache: Record<string, Episode[]>
  loadingEpisodes: Set<string>
  toggleExpand: (seriesId: string) => Promise<void>
  onTogglePublish: (id: string) => void
  onToggleFeatured: (id: string) => void
  onDelete: (id: string) => void
  onSelectionChange?: (selectedIds: string[]) => void
  selectedSet: Set<string>
  allPageSelected: boolean
  somePageSelected: boolean
  handleSelectAll: () => void
  handleSelectRow: (id: string) => void
}

/**
 * Hook to generate table column definitions
 */
export function useTableColumns(options: UseTableColumnsOptions): GlassTableColumn<TableRow>[] {
  const {
    t,
    isRTL,
    expandedSeries,
    episodeCache,
    loadingEpisodes,
    toggleExpand,
    onTogglePublish,
    onToggleFeatured,
    onDelete,
    onSelectionChange,
    selectedSet,
    allPageSelected,
    somePageSelected,
    handleSelectAll,
    handleSelectRow,
  } = options

  const renderContext = useMemo(
    () => ({
      t,
      isRTL,
      expandedSeries,
      episodeCache,
      loadingEpisodes,
      toggleExpand,
      onTogglePublish,
      onToggleFeatured,
      onDelete,
    }),
    [t, isRTL, expandedSeries, episodeCache, loadingEpisodes, toggleExpand, onTogglePublish, onToggleFeatured, onDelete]
  )

  return useMemo<GlassTableColumn<TableRow>[]>(
    () => [
      // Selection checkbox column
      ...(onSelectionChange
        ? [
            {
              key: 'select',
              label: '',
              width: 50,
              align: 'center' as const,
              headerRender: () => (
                <SelectionHeader
                  allSelected={allPageSelected}
                  someSelected={somePageSelected}
                  onSelectAll={handleSelectAll}
                />
              ),
              render: (_: unknown, row: TableRow) => renderSelectionCell(row, selectedSet, handleSelectRow),
            },
          ]
        : []),
      {
        key: 'expand',
        label: '',
        width: 50,
        align: 'center',
        render: (_, row) => renderExpandCell(row, renderContext),
      },
      {
        key: 'thumbnail',
        label: '',
        width: 80,
        render: (_, row) => renderThumbnailCell(row, renderContext),
      },
      {
        key: 'title',
        label: t('admin.content.columns.title'),
        render: (_, row) => renderTitleCell(row, renderContext),
      },
      {
        key: 'category',
        label: t('admin.content.columns.category'),
        width: 140,
        render: (_, row) => renderCategoryCell(row, renderContext),
      },
      {
        key: 'year',
        label: t('admin.content.columns.year'),
        width: 80,
        render: (_, row) => renderYearCell(row, renderContext),
      },
      {
        key: 'subtitles',
        label: t('admin.content.columns.subtitles', 'Subtitles'),
        width: 120,
        render: (_, row) => renderSubtitlesCell(row, renderContext),
      },
      {
        key: 'status',
        label: t('admin.content.columns.status'),
        width: 120,
        render: (_, row) => renderStatusCell(row, renderContext),
      },
      {
        key: 'actions',
        label: t('common.actions'),
        width: 180,
        render: (_, row) => renderActionsCell(row, renderContext),
      },
    ],
    [renderContext, onSelectionChange, selectedSet, allPageSelected, somePageSelected, handleSelectAll, handleSelectRow, t]
  )
}

export type { TableRow }
