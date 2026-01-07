import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Sparkles, Loader2, Mic, MicOff, Square } from 'lucide-react'
import { chatService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import logger from '@/utils/logger'

export default function Chatbot() {
  const { isAuthenticated, user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'שלום! אני העוזר החכם של בית+. איך אוכל לעזור לך היום? לחץ על המיקרופון ודבר אליי בעברית, או הקלד הודעה.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Transcribe audio
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      logger.error('Failed to start recording', 'Chatbot', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'לא הצלחתי לגשת למיקרופון. אנא בדוק את הרשאות המיקרופון בדפדפן.',
          isError: true,
        },
      ])
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true)
    try {
      const response = await chatService.transcribeAudio(audioBlob)
      const transcribedText = response.text

      if (transcribedText) {
        // Auto-send the transcribed message
        setInput('')
        setMessages((prev) => [...prev, { role: 'user', content: transcribedText }])
        setIsLoading(true)

        try {
          const chatResponse = await chatService.sendMessage(transcribedText, conversationId)
          setConversationId(chatResponse.conversation_id)
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: chatResponse.message },
          ])

          if (chatResponse.recommendations) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                type: 'recommendations',
                content: chatResponse.recommendations,
              },
            ])
          }
        } catch (error) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'מצטער, משהו השתבש. אנא נסה שוב.',
              isError: true,
            },
          ])
        } finally {
          setIsLoading(false)
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'לא הצלחתי לתמלל את ההקלטה. אנא נסה שוב.',
          isError: true,
        },
      ])
    } finally {
      setIsTranscribing(false)
    }
  }

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(userMessage, conversationId)
      setConversationId(response.conversation_id)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message },
      ])

      if (response.recommendations) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'recommendations',
            content: response.recommendations,
          },
        ])
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'מצטער, משהו השתבש. אנא נסה שוב.',
          isError: true,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    'מה לראות היום?',
    'סרטים ישראליים מומלצים',
    'מה משודר עכשיו?',
    'פודקאסטים פופולריים',
  ]

  const handleSuggestion = (question) => {
    setInput(question)
    inputRef.current?.focus()
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-50 w-14 h-14 glass-btn-purple rounded-full shadow-glass flex items-center justify-center hover:shadow-glow-purple hover:scale-110 transition-all duration-300 ${
          isOpen ? 'hidden' : ''
        }`}
        aria-label="פתח צ'אט"
      >
        <Sparkles size={24} className="text-white" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[70vh] glass-modal flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-l from-primary-600/20 to-purple-600/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full glass-btn-purple flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <span className="font-semibold">עוזר בית+</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="glass-btn-ghost glass-btn-icon-sm"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}
              >
                {message.type === 'recommendations' ? (
                  <div className="w-full">
                    <p className="text-sm text-dark-400 mb-2">הנה כמה המלצות:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {message.content.map((item) => (
                        <a
                          key={item.id}
                          href={`/vod/${item.id}`}
                          className="block glass-card-sm p-2 hover:shadow-glow transition-all"
                        >
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full aspect-video object-cover rounded-lg mb-1"
                          />
                          <p className="text-sm truncate">{item.title}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                      message.role === 'user'
                        ? 'glass-btn-primary rounded-tr-sm'
                        : message.isError
                        ? 'glass-badge-danger rounded-tl-sm'
                        : 'glass-card-sm rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end animate-fade-in">
                <div className="px-4 py-2.5 glass-card-sm rounded-2xl rounded-tl-sm">
                  <Loader2 size={20} className="animate-spin text-primary-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(q)}
                    className="glass-tab-pill text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
            {/* Recording/Transcribing Status */}
            {(isRecording || isTranscribing) && (
              <div className="flex items-center justify-center gap-2 mb-3 text-sm">
                {isRecording && (
                  <>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400">מקליט... לחץ שוב לסיום</span>
                  </>
                )}
                {isTranscribing && (
                  <>
                    <Loader2 size={16} className="animate-spin text-primary-400" />
                    <span className="text-primary-400">מתמלל...</span>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {/* Microphone Button - Primary for TV remote */}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading || isTranscribing}
                className={`w-12 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? 'glass-btn-danger animate-pulse shadow-glow-danger'
                    : 'glass-btn-purple hover:shadow-glow-purple'
                }`}
                aria-label={isRecording ? 'עצור הקלטה' : 'התחל הקלטה קולית'}
              >
                {isRecording ? (
                  <Square size={16} fill="white" />
                ) : (
                  <Mic size={18} />
                )}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="או הקלד כאן..."
                className="glass-input flex-1 rounded-full h-10 text-sm"
                disabled={isLoading || isRecording || isTranscribing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isRecording || isTranscribing}
                className="glass-btn-primary w-10 h-10 rounded-full flex items-center justify-center"
              >
                <Send size={16} className="mr-[-2px]" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
