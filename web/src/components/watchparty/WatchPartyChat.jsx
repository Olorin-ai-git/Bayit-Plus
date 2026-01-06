import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import WatchPartyChatInput from './WatchPartyChatInput'

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function ChatMessage({ message, isOwnMessage }) {
  const isEmoji = message.message_type === 'emoji'
  const isSystem = message.message_type === 'system'

  if (isSystem) {
    return (
      <div className="text-center py-1">
        <span className="text-xs text-dark-400 bg-white/5 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'flex gap-2 group',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-3 py-2',
          isEmoji
            ? 'bg-transparent text-3xl'
            : isOwnMessage
              ? 'bg-primary-500/20 text-white'
              : 'bg-white/10 text-white'
        )}
      >
        {!isOwnMessage && !isEmoji && (
          <div className="text-xs font-medium text-primary-400 mb-0.5">
            {message.user_name}
          </div>
        )}
        <div className={clsx('break-words', !isEmoji && 'text-sm')}>
          {message.content}
        </div>
        {!isEmoji && (
          <div
            className={clsx(
              'text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
              isOwnMessage ? 'text-primary-300' : 'text-dark-400'
            )}
          >
            {formatTime(message.created_at)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function WatchPartyChat({
  messages,
  currentUserId,
  onSendMessage,
  chatEnabled,
}) {
  const { t } = useTranslation()
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-medium text-dark-300 px-1 mb-2 flex-shrink-0">
        {t('watchParty.chat')}
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 px-1 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="text-center text-dark-400 text-sm py-8">
            {t('watchParty.typeMessage')}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id || idx}
              message={msg}
              isOwnMessage={msg.user_id === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 pt-3 border-t border-white/10 mt-2">
        <WatchPartyChatInput
          onSend={onSendMessage}
          disabled={!chatEnabled}
        />
      </div>
    </div>
  )
}
