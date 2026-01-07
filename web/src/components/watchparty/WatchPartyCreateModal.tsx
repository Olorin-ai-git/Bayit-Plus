import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, MessageSquare, RefreshCw } from 'lucide-react'
import GlassModal from '../ui/GlassModal'
import GlassButton from '../ui/GlassButton'
import GlassCheckbox from '../ui/GlassCheckbox'
import logger from '@/utils/logger'

export default function WatchPartyCreateModal({
  isOpen,
  onClose,
  onCreate,
  contentTitle,
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState({
    chatEnabled: true,
    syncPlayback: true,
  })

  const handleCreate = async () => {
    setLoading(true)
    try {
      await onCreate(options)
      onClose()
    } catch (err) {
      logger.error('Failed to create party', 'WatchPartyCreateModal', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleOption = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('watchParty.createTitle')}
      size="sm"
    >
      <div className="space-y-6">
        {contentTitle && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <Users size={20} className="text-primary-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-dark-400">{t('watchParty.title')}</div>
              <div className="text-sm font-medium text-white truncate">
                {contentTitle}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => toggleOption('chatEnabled')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-right"
          >
            <MessageSquare size={20} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">
                {t('watchParty.options.chatEnabled')}
              </div>
            </div>
            <GlassCheckbox
              checked={options.chatEnabled}
              onChange={() => toggleOption('chatEnabled')}
            />
          </button>

          <button
            type="button"
            onClick={() => toggleOption('syncPlayback')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-right"
          >
            <RefreshCw size={20} className="text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">
                {t('watchParty.options.syncPlayback')}
              </div>
            </div>
            <GlassCheckbox
              checked={options.syncPlayback}
              onChange={() => toggleOption('syncPlayback')}
            />
          </button>
        </div>

        <div className="flex gap-3">
          <GlassButton
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            {t('common.cancel')}
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleCreate}
            loading={loading}
            className="flex-1"
          >
            {t('watchParty.create')}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  )
}
