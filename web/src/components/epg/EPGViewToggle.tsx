import React from 'react'
import { Grid, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type EPGViewMode = 'grid' | 'list'

interface EPGViewToggleProps {
  view: EPGViewMode
  onViewChange: (view: EPGViewMode) => void
}

const EPGViewToggle: React.FC<EPGViewToggleProps> = ({ view, onViewChange }) => {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 bg-black/10 backdrop-blur-sm rounded-xl p-1">
      <button
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          view === 'grid'
            ? 'bg-primary text-white shadow-glow'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
        onClick={() => onViewChange('grid')}
        aria-label={t('epg.gridView')}
      >
        <Grid size={18} />
        <span className="text-sm font-medium">{t('epg.gridView')}</span>
      </button>
      <button
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          view === 'list'
            ? 'bg-primary text-white shadow-glow'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
        onClick={() => onViewChange('list')}
        aria-label={t('epg.listView')}
      >
        <List size={18} />
        <span className="text-sm font-medium">{t('epg.listView')}</span>
      </button>
    </div>
  )
}

export default EPGViewToggle
