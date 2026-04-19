import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, MapPin, ShieldPlus, RefreshCw, ChevronDown, ChevronUp, Bot } from 'lucide-react'
import { triageChat, parseUrgency, cleanText, mergeUrgencyLevel } from './triage'
import { findClinics } from './clinics'
import { detectTopTopics } from './retrieval'
import UrgencyBadge from './components/UrgencyBadge'
import ClinicCard from './components/ClinicCard'
import MessageBubble from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'

const WELCOME_ID = 'welcome'
const QUICK_SYMPTOM_CHIPS = [
  'Headache for 3 days',
  'Fever and cough',
  'Chest pain and shortness of breath',
  'Stomach pain with vomiting',
]

function welcomeMessage() {
  return {
    id: WELCOME_ID,
    role: 'assistant',
    content:
      "Hi! I'm **Dr. Stack**. I provide free AI symptom triage and nearby health center lookup for uninsured patients.\n\nTell me what you're feeling right now and how long you've had it.",
  }
}

function ApiKeyBanner() {
  const useMock = import.meta.env.VITE_USE_MOCK_TRIAGE === 'true'
  if (useMock) {
    return (
      <div className="glass-panel text-slate-700 rounded-2xl px-4 py-3 text-xs leading-relaxed">
        Running in <strong>mock mode</strong>. Set{' '}
        <code className="font-mono">VITE_USE_MOCK_TRIAGE=false</code> for live server-backed triage.
      </div>
    )
  }
  return (
    <div className="glass-panel text-slate-600 rounded-2xl px-4 py-3 text-xs leading-relaxed">
      Live mode enabled. API keys are handled on the backend.
    </div>
  )
}

export default function App() {
  const useMock = import.meta.env.VITE_USE_MOCK_TRIAGE === 'true'
  const [messages, setMessages] = useState(() => [welcomeMessage()])
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [urgency, setUrgency] = useState(null)
  const [triageWarning, setTriageWarning] = useState(null)
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
        const triage = await triageChat(apiMessages)
        const detectedUrgency = parseUrgency(triage.reply)
        const cleanReply = cleanText(triage.reply)
        if (triage.degraded) {
          setTriageWarning(
            triage.degradedReason === 'mock_mode'
              ? 'Triage is running in mock mode.'
              : 'AI provider is temporarily unavailable. Using fallback triage responses.'
          )
        } else {
          setTriageWarning(null)
        }
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
    setTriageWarning(null)
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
  const hasUserMessages = useMemo(() => messages.some(m => m.role === 'user'), [messages])
  const retrievedTopics = useMemo(() => detectTopTopics(messages), [messages])

  const useQuickPrompt = useCallback(text => {
    if (loading) return
    setInput(text)
    inputRef.current?.focus()
  }, [loading])

  return (
    <div className="min-h-dvh bg-health-base text-slate-900 flex flex-col items-center p-4 sm:p-6">
      <header className="w-full max-w-6xl shrink-0 pt-2 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-700 flex items-center justify-center shadow-md ring-1 ring-amber-200 shrink-0">
              <ShieldPlus size={22} className="text-amber-50" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl sm:text-[1.65rem] font-normal text-slate-900 tracking-tight leading-tight">
                Dr. Stack
              </h1>
              <p className="text-xs text-slate-500 truncate">
                Free AI symptom triage for uninsured patients
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex text-[11px] rounded-full px-2.5 py-1 border tracking-wide ${
                useMock
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-white border-amber-200 text-amber-800'
              }`}
            >
              {useMock ? 'Mock Mode' : 'Live Gemini'}
            </span>
            <button
              type="button"
              onClick={resetChat}
              title="Start a new conversation"
              className="p-2.5 rounded-xl text-slate-500 hover:text-amber-800 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
            >
              <RefreshCw size={18} aria-hidden />
              <span className="sr-only">New chat</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 flex-1 min-h-0">
        <section className="lg:col-span-2 space-y-3">
          <ApiKeyBanner />
          {triageWarning && (
            <div className="glass-panel text-amber-900 rounded-2xl px-4 py-3 text-xs leading-relaxed border border-amber-200">
              {triageWarning}
            </div>
          )}
          {urgency && <UrgencyBadge level={urgency} />}
        </section>

        <section
          aria-labelledby="chat-heading"
          className="ui-card flex flex-col overflow-hidden min-h-[min(560px,calc(100dvh-18rem))] max-h-[min(700px,calc(100dvh-6rem))]"
        >
          <h2 id="chat-heading" className="sr-only">
            Chat with Dr. Stack
          </h2>
          <div className="px-4 sm:px-5 py-3 border-b subtle-divider bg-gradient-to-r from-[#f7eee1] to-[#fdf8ef]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Bot size={13} className="text-amber-700" /> Start with a symptom
              </span>
              <span className="text-[11px] text-slate-500">Press Enter to send</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-medium text-slate-500">Examples:</span>
              {QUICK_SYMPTOM_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => useQuickPrompt(chip)}
                  className="ui-chip whitespace-nowrap px-2.5 py-1 text-[11px]"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">AI context:</span>
              {retrievedTopics.length > 0 ? (
                retrievedTopics.map(topic => (
                  <span
                    key={topic.id}
                    className="ui-chip inline-flex items-center px-2 py-0.5 text-[11px]"
                  >
                    {topic.title}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-500">General triage mode</span>
              )}
            </div>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-gradient-to-b from-[#f8efe2] to-[#fffdf8]"
            role="log"
            aria-relevant="additions"
            aria-live="polite"
          >
            {!hasUserMessages && (
              <div className="ui-card rounded-xl p-3.5 text-xs text-slate-600 shadow-none">
                <p className="font-medium text-slate-800 mb-1">Share the basics first:</p>
                <p>What symptoms you have, how long, and what is getting better or worse.</p>
              </div>
            )}
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
          <div className="px-4 sm:px-5 py-2.5 bg-[#f8f1e6] border-t subtle-divider">
            <p className="text-[11px] sm:text-xs text-slate-600 text-center leading-snug">
              Not a medical diagnosis. For emergencies, call 911. Always follow advice from a licensed
              clinician.
            </p>
          </div>
          <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t subtle-divider bg-white flex gap-2 items-end">
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
              className="ui-input flex-1 px-4 py-3 text-sm min-h-[44px]"
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
              className="ui-button w-11 h-11 flex items-center justify-center disabled:opacity-40 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 shadow-sm"
            >
              <Send size={16} aria-hidden />
              <span className="sr-only">Send</span>
            </button>
          </form>
        </section>

        <section
          aria-labelledby="clinics-heading"
          className="ui-card overflow-hidden lg:min-h-0 lg:flex lg:flex-col"
        >
          <div className="p-4 sm:p-5 lg:pb-4 border-b subtle-divider">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <MapPin size={16} className="text-amber-700 shrink-0" aria-hidden />
              <h2 id="clinics-heading" className="font-semibold text-sm text-slate-900">
                Find free clinics near you
              </h2>
              <span className="text-xs text-slate-500 sm:ml-auto w-full sm:w-auto">Live data from HRSA</span>
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
                className="ui-input flex-1 min-w-0 px-3 py-2.5 text-sm min-h-[44px]"
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
                className="ui-button px-4 py-2.5 text-sm min-h-[44px] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
              >
                {clinicsLoading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>

          {clinicsLoading && (
            <div className="px-4 sm:px-5 py-4 space-y-2">
              <div className="h-16 rounded-xl bg-amber-100 animate-pulse" />
              <div className="h-16 rounded-xl bg-amber-100 animate-pulse" />
              <div className="h-16 rounded-xl bg-amber-100 animate-pulse" />
            </div>
          )}

          {clinicsError && (
            <div className="px-4 sm:px-5 pb-4" role="alert">
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                {clinicsError}
              </p>
            </div>
          )}

          {clinics.length > 0 && (
            <div className="border-t subtle-divider lg:min-h-0 lg:flex lg:flex-col">
              <button
                type="button"
                onClick={() => setShowClinics(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-700 hover:bg-[#f8efe2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
              >
                <span>
                  {clinics.length} clinic{clinics.length === 1 ? '' : 's'} within 25 miles
                </span>
                {showClinics ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              </button>
              {showClinics && (
                <ul className="px-4 pb-4 pt-1 space-y-2 list-none m-0 lg:overflow-y-auto lg:min-h-0">
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
              <p className="text-xs text-slate-500 text-center py-2 leading-relaxed">
                No centers in that radius. Try another ZIP or search on{' '}
                <a
                  href="https://findahealthcenter.hrsa.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline underline-offset-2 hover:text-amber-800"
                >
                  findahealthcenter.hrsa.gov
                </a>
                .
              </p>
            </div>
          )}
        </section>

        <p className="lg:col-span-2 text-center text-xs text-slate-500 pb-2 shrink-0">
          Dr. Stack · Gemini · Hook &apos;Em Hacks 2026
        </p>
      </main>
    </div>
  )
}
