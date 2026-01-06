import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Smile } from 'lucide-react'
import { clsx } from 'clsx'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥']

export default function WatchPartyChatInput({ onSend, disabled }) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setMessage('')
    inputRef.current?.focus()
  }

  const handleEmojiClick = (emoji) => {
    onSend(emoji, 'emoji')
    setShowEmojis(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="relative">
      {showEmojis && (
        <div className="absolute bottom-full mb-2 right-0 flex gap-1 p-2 rounded-xl glass animate-slide-up">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className={clsx(
            'glass-btn-ghost glass-btn-icon-sm flex-shrink-0',
            showEmojis && 'bg-white/10'
          )}
        >
          <Smile size={18} />
        </button>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('watchParty.typeMessage')}
            disabled={disabled}
            className="glass-input text-sm py-2"
            maxLength={500}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={clsx(
            'glass-btn-primary glass-btn-icon-sm flex-shrink-0',
            (!message.trim() || disabled) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
