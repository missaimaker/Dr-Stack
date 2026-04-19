import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, MapPin, Heart, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { triageChat, parseUrgency, cleanText, mergeUrgencyLevel } from './triage'
import { findClinics } from './clinics'
import UrgencyBadge from './components/UrgencyBadge'
import ClinicCard from './components/ClinicCard'
import MessageBubble from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'

const WELCOME_ID = 'welcome'

function welcomeMessage() {
  return {
    id: WELCOME_ID,
    role: 'assistant',
    content:
      "Hi! I'm **Dr. Stack** — your AI health navigator. No insurance? No problem. Tell me what's going on and I'll help you figure out next steps.\n\nWhat symptoms are you experiencing?",
  }
}

function ApiKeyBanner() {
  const useMock = import.meta.env.VITE_USE_MOCK_TRIAGE === 'true'
  if (useMock) {
    return (
      <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-2xl px-4 py-3 text-xs leading-relaxed">
        Running in <strong>mock mode</strong>. Triage responses are local demo responses. Set{' '}
        <code className="font-mono">VITE_USE_MOCK_TRIAGE=false</code> and add a real{' '}
        <code className="font-mono">VITE_GEMINI_API_KEY</code> for live AI.
      </div>
    )
  }
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 text-xs leading-relaxed">
        <strong>API key missing.</strong> Add{' '}
        <code className="font-mono">VITE_GEMINI_API_KEY</code> to{' '}
        <code className="font-mono">.env</code> and restart{' '}
        <code className="font-mono">npm run dev</code>.
      </div>
    )
  }
  if (!key.startsWith('AIza')) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 text-xs leading-relaxed">
        <strong>API key looks wrong.</strong> Gemini keys usually start with{' '}
        <code className="font-mono">AIza</code>. Yours doesn’t—replace it in{' '}
        <code className="font-mono">.env</code> and restart{' '}
        <code className="font-mono">npm run dev</code>.
      </div>
    )
  }
  return null
}

export default function App() {
  const [messages, setMessages] = useState(() => [welcomeMessage()])
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [urgency, setUrgency] = useState(null)
  const [zipCode, setZipCode] = useState('')
  const [clinics, setClinics] = useState([])
  const [clinicsLoading, setClinicsLoading] = useState(false)
  const [clinicsError, setClinicsError] = useState(null)
  const [lastSearchedZip, setLastSearchedZip] = useState(null)
  const [showClinics, setShowClinics] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(
    async e => {
      e?.preventDefault()
      if (!input.trim() || loading) return
      const userMsg = { id: crypto.randomUUID(), role: 'user', content: input.trim() }
      const newMessages = [...messagesRef.current, userMsg]
      setMessages(newMessages)
      setInput('')
      setLoading(true)
      try {
        const apiMessages = newMessages.map(m => ({
          role: m.role,
          content: m.content.replace(/\*\*/g, ''),
        }))
        const reply = await triageChat(apiMessages)
        const detectedUrgency = parseUrgency(reply)
        const cleanReply = cleanText(reply)
        if (detectedUrgency) {
          setUrgency(prev => mergeUrgencyLevel(prev, detectedUrgency))
        }
        setMessages(prev => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: cleanReply },
        ])
      } catch (err) {
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I couldn't contact the AI right now: ${err.message}`,
          },
        ])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [input, loading]
  )

  const lookupClinics = useCallback(async () => {
    if (!zipCode || zipCode.length < 5) return
    setClinicsLoading(true)
    setClinics([])
    setClinicsError(null)
    setLastSearchedZip(null)
    const { clinics: results, error } = await findClinics(zipCode)
    setClinics(results)
    setClinicsError(error)
    setLastSearchedZip(zipCode)
    setClinicsLoading(false)
  }, [zipCode])

  const resetChat = useCallback(() => {
    setMessages([welcomeMessage()])
    setUrgency(null)
    setClinics([])
    setClinicsError(null)
    setLastSearchedZip(null)
    setZipCode('')
    setInput('')
  }, [])

  const onZipChange = useCallback(e => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 5)
    setZipCode(v)
    if (v.length < 5) {
      setClinics([])
      setClinicsError(null)
      setLastSearchedZip(null)
    }
  }, [])

  const showNoClinicResults =
    lastSearchedZip === zipCode &&
    zipCode.length === 5 &&
    !clinicsLoading &&
    clinics.length === 0 &&
    !clinicsError

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#f7f5f2] via-[#f7f5f2] to-[#eef8f6] flex flex-col items-center p-4 sm:p-6">
      <header className="w-full max-w-2xl shrink-0 pt-2 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-900/10 ring-1 ring-teal-700/20 shrink-0">
              <Heart size={22} className="text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl sm:text-[1.65rem] font-normal text-stone-800 tracking-tight leading-tight">
                Dr. Stack
              </h1>
              <p className="text-xs text-stone-500 truncate">Symptom triage · free clinic finder</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-stone-400 hidden sm:inline">Hook &apos;Em Hacks 2026</span>
            <button
              type="button"
              onClick={resetChat}
              title="Start a new conversation"
              className="p-2.5 rounded-xl text-stone-400 hover:text-teal-700 hover:bg-teal-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
            >
              <RefreshCw size={18} aria-hidden />
              <span className="sr-only">New chat</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl flex flex-col gap-4 flex-1 min-h-0">
        <ApiKeyBanner />
        {urgency && <UrgencyBadge level={urgency} />}

        <section
          aria-labelledby="chat-heading"
          className="bg-stone-100/90 backdrop-blur-sm rounded-3xl shadow-sm border border-stone-200/80 flex flex-col overflow-hidden min-h-[min(520px,calc(100dvh-22rem))] max-h-[min(560px,calc(100dvh-14rem))] sm:max-h-[min(600px,calc(100dvh-12rem))]"
        >
          <h2 id="chat-heading" className="sr-only">
            Chat with Dr. Stack
          </h2>
          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3"
            role="log"
            aria-relevant="additions"
            aria-live="polite"
          >
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
          <div className="px-4 sm:px-5 py-2.5 bg-amber-50/95 border-t border-amber-100/80">
            <p className="text-[11px] sm:text-xs text-amber-900/80 text-center leading-snug">
              Not a medical diagnosis. For emergencies, call 911. Always follow advice from a licensed
              clinician.
            </p>
          </div>
          <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t border-stone-200 bg-white flex gap-2 items-end">
            <label htmlFor="symptom-input" className="sr-only">
              Describe your symptoms
            </label>
            <input
              id="symptom-input"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Describe your symptoms…"
              disabled={loading}
              autoComplete="off"
              className="flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:border-teal-300 disabled:opacity-50 bg-stone-50/80 min-h-[44px]"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              title="Send message"
              className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
            >
              <Send size={16} aria-hidden />
              <span className="sr-only">Send</span>
            </button>
          </form>
        </section>

        <section
          aria-labelledby="clinics-heading"
          className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden"
        >
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <MapPin size={16} className="text-teal-600 shrink-0" aria-hidden />
              <h2 id="clinics-heading" className="font-semibold text-sm text-stone-800">
                Find free clinics near you
              </h2>
              <span className="text-xs text-stone-400 sm:ml-auto w-full sm:w-auto">Data from HRSA</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="zip-input" className="sr-only">
                ZIP code
              </label>
              <input
                id="zip-input"
                value={zipCode}
                onChange={onZipChange}
                placeholder="5-digit ZIP"
                inputMode="numeric"
                pattern="[0-9]*"
                className="flex-1 min-w-0 rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:border-teal-300 bg-stone-50/80 min-h-[44px]"
                onKeyDown={e => {
                  if (e.key === 'Enter') lookupClinics()
                }}
                maxLength={5}
                autoComplete="postal-code"
              />
              <button
                type="button"
                onClick={lookupClinics}
                disabled={clinicsLoading || zipCode.length < 5}
                className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
              >
                {clinicsLoading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>

          {clinicsError && (
            <div className="px-4 sm:px-5 pb-4" role="alert">
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                {clinicsError}
              </p>
            </div>
          )}

          {clinics.length > 0 && (
            <div className="border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowClinics(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400"
              >
                <span>
                  {clinics.length} clinic{clinics.length === 1 ? '' : 's'} within 25 miles
                </span>
                {showClinics ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              </button>
              {showClinics && (
                <ul className="px-4 pb-4 space-y-2 list-none m-0">
                  {clinics.map(c => (
                    <li key={`${c.name}-${c.address}`}>
                      <ClinicCard clinic={c} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showNoClinicResults && (
            <div className="px-4 pb-4">
              <p className="text-xs text-stone-500 text-center py-2 leading-relaxed">
                No centers in that radius. Try another ZIP or search on{' '}
                <a
                  href="https://findahealthcenter.hrsa.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 underline underline-offset-2 hover:text-teal-900"
                >
                  findahealthcenter.hrsa.gov
                </a>
                .
              </p>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-stone-400 pb-4 shrink-0">
          Dr. Stack · Gemini · Hook &apos;Em Hacks 2026
        </p>
      </main>
    </div>
  )
}
