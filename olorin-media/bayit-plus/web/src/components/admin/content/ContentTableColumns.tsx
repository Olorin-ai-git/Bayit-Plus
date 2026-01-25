import { Text } from 'react-native'
import type { HierarchicalTableColumn } from '@bayit/shared/ui'
import type { ContentItem } from '../../../types/admin'

export const getContentTableColumns = (t: (key: string) => string): HierarchicalTableColumn[] => [
  {
    key: 'title',
    label: t('admin.content.columns.title'),
    width: 250,
    sortable: true,
  },
  {
    key: 'category',
    label: t('admin.content.columns.category'),
    width: 150,
    sortable: true,
  },
  {
    key: 'year',
    label: t('admin.content.columns.year'),
    width: 80,
    sortable: true,
  },
  {
    key: 'subtitles',
    label: t('admin.content.columns.subtitles'),
    width: 120,
    sortable: false,
  },
  {
    key: 'status',
    label: t('admin.content.columns.status'),
    width: 100,
    sortable: true,
  },
  {
    key: 'actions',
    label: t('common.actions'),
    width: 120,
    sortable: false,
  },
]
