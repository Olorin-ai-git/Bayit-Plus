import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import GlassModal from '../ui/GlassModal'
import GlassButton from '../ui/GlassButton'
import GlassInput from '../ui/GlassInput'

export default function WatchPartyJoinModal({ isOpen, onClose, onJoin }) {
  const { t } = useTranslation()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    const code = roomCode.trim().toUpperCase()
    if (!code) {
      setError(t('watchParty.errors.invalidCode'))
      return
    }

    setLoading(true)
    setError('')

    try {
      await onJoin(code)
      onClose()
    } catch (err) {
      const errorKey = err.code || 'connectionError'
      setError(t(`watchParty.errors.${errorKey}`, t('watchParty.errors.joinFailed')))
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setRoomCode(value.slice(0, 8))
    if (error) setError('')
  }

  const handleClose = () => {
    setRoomCode('')
    setError('')
    onClose()
  }

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('watchParty.joinTitle')}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
            <UserPlus size={32} className="text-primary-400" />
          </div>
        </div>

        <div className="text-center text-dark-300 text-sm">
          {t('watchParty.enterCode')}
        </div>

        <GlassInput
          value={roomCode}
          onChange={handleCodeChange}
          placeholder="ABCD1234"
          error={error}
          className="text-center font-mono text-2xl tracking-[0.3em] uppercase"
          autoFocus
          autoComplete="off"
        />

        <div className="flex gap-3">
          <GlassButton
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="flex-1"
          >
            {t('common.cancel')}
          </GlassButton>
          <GlassButton
            type="submit"
            variant="primary"
            loading={loading}
            disabled={roomCode.length < 4}
            className="flex-1"
          >
            {t('watchParty.join')}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  )
}
