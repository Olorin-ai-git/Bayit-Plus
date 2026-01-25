import { Merge, Star, StarOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AdminBatchActionBar from '../shared/AdminBatchActionBar'

interface ContentBatchActionsProps {
  selectedIds: string[]
  onClearSelection: () => void
  onMerge: () => void
  onBatchFeature: () => void
  onBatchUnfeature: () => void
  onBatchDelete: () => void
  isRTL?: boolean
}

export default function ContentBatchActions({
  selectedIds,
  onClearSelection,
  onMerge,
  onBatchFeature,
  onBatchUnfeature,
  onBatchDelete,
  isRTL = false,
}: ContentBatchActionsProps) {
  const { t } = useTranslation()

  const actions = [
    {
      label: t('admin.content.batchMerge'),
      icon: <Merge size={16} />,
      onPress: onMerge,
      variant: 'secondary' as const,
      disabled: selectedIds.length < 2,
    },
    {
      label: t('admin.content.batchFeature'),
      icon: <Star size={16} />,
      onPress: onBatchFeature,
      variant: 'secondary' as const,
    },
    {
      label: t('admin.content.batchUnfeature'),
      icon: <StarOff size={16} />,
      onPress: onBatchUnfeature,
      variant: 'secondary' as const,
    },
    {
      label: t('common.delete'),
      icon: <Trash2 size={16} />,
      onPress: onBatchDelete,
      variant: 'danger' as const,
    },
  ]

  return (
    <AdminBatchActionBar
      selectedCount={selectedIds.length}
      onClearSelection={onClearSelection}
      actions={actions}
      isRTL={isRTL}
    />
  )
}
