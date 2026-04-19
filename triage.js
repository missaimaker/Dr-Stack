const SYSTEM_PROMPT = `You are Dr. Stack  — a caring AI health navigator built at Hook 'Em Hacks 2026.
Your job: help uninsured patients understand symptoms, assess urgency, and find free care.

PERSONALITY: Warm, clear, occasionally drops a light CS joke. Never snarky about health.

RULES:
- NEVER diagnose. Say "this may suggest..." not "you have..."
- ALWAYS recommend professional care for serious symptoms
- After 3-4 messages assess urgency with EXACTLY one of:
  [URGENCY:EMERGENCY] [URGENCY:URGENT] [URGENCY:NON-URGENT]
- Chest pain / difficulty breathing / stroke signs → immediately output [URGENCY:EMERGENCY]
- Keep responses to 3-5 sentences. Ask one clarifying question at a time.`

function mockTriageReply(messages) {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase())
  const lastUser = userMessages[userMessages.length - 1] || ''
  const fullUserContext = userMessages.join(' ')
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || ''
  const emergencyHints = ['chest pain', 'trouble breathing', 'shortness of breath', 'stroke', 'fainted']
  const urgentHints = ['fever', 'vomit', 'infection', 'severe pain', 'blood']
  const redFlagHints = ['neck stiffness', 'vision changes', 'confusion', 'weakness', 'numbness']
  const hasHeadache = fullUserContext.includes('headache') || fullUserContext.includes('migraine')
  const mentionsDuration = /\b(\d+)\s*(day|days|week|weeks)\b/.test(lastUser)
  const mentionsWorsening = /worse|worsening|getting worse|severe/.test(lastUser)
  const isYes = /^(y|yes|yeah|yep|sure|i do|they do|i have|they have)\b/.test(lastUser.trim())
  const isNo = /^(n|no|nope|nah|not really|i don't|dont|they don't|they dont)\b/.test(lastUser.trim())
  const isAcknowledgement = /^(ok|okay|thanks|thank you|got it|alright)\b/.test(lastUser.trim())

  if (emergencyHints.some(h => lastUser.includes(h))) {
    return '[URGENCY:EMERGENCY] Your symptoms may need emergency care. Please call 911 or go to the nearest ER now. If someone is with you, ask them to help you get care immediately.'
  }
  if (urgentHints.some(h => lastUser.includes(h))) {
    return '[URGENCY:URGENT] These symptoms may need same-day care. Please visit urgent care or a clinic today. If symptoms worsen suddenly, call 911.'
  }

  // If we just asked about red flags and the user answered yes/no, don't repeat the same question.
  const askedRedFlags =
    hasHeadache &&
    (lastAssistant.includes('red-flag') ||
      lastAssistant.includes('red flag') ||
      lastAssistant.includes('vision changes') ||
      lastAssistant.includes('weakness') ||
      lastAssistant.includes('confusion'))
  if (askedRedFlags && isYes) {
    return '[URGENCY:URGENT] Since you’re having red-flag symptoms with a headache, it’s safest to get same-day in-person care. Please go to urgent care now (or the ER if symptoms are severe/sudden). Which red flags do you have: vision changes, fever, vomiting, weakness/numbness, confusion, or neck stiffness?'
  }
  if (askedRedFlags && isNo) {
    return '[URGENCY:NON-URGENT] That’s reassuring. Try hydration, rest, and an OTC pain reliever if you can take it safely. If the headache lasts more than 3 days, keeps returning, or worsens, get checked at a clinic. On a scale of 1–10, how bad is the pain?'
  }
  if (hasHeadache && redFlagHints.some(h => fullUserContext.includes(h))) {
    return '[URGENCY:URGENT] With headache plus red-flag symptoms like neck stiffness/neurologic changes, please get same-day in-person care now. If symptoms suddenly worsen, call 911. If you want, I can help you find a nearby free clinic by ZIP code.'
  }
  if (hasHeadache && lastAssistant.includes('safest to get same-day in-person care') && isAcknowledgement) {
    return '[URGENCY:URGENT] Understood. Please seek care today. Share your ZIP code and I can help list nearby free clinics.'
  }

  if (hasHeadache && mentionsDuration) {
    return '[URGENCY:NON-URGENT] A headache lasting several days should be checked by a clinician soon, especially if it is new for you. Rest, hydrate, and avoid skipping meals while you monitor symptoms. Seek urgent care now if you develop vision changes, confusion, neck stiffness, repeated vomiting, weakness, or the worst headache of your life. Is the pain improving, staying the same, or getting worse?'
  }
  if (hasHeadache && mentionsWorsening) {
    return '[URGENCY:URGENT] Since your headache is getting worse, it is safest to get same-day in-person care. Please visit urgent care today, and call 911 if severe neurologic symptoms appear (confusion, weakness, trouble speaking, or sudden vision loss).'
  }
  if (hasHeadache) {
    return '[URGENCY:NON-URGENT] Thanks for sharing. Most headaches are not emergencies, but context matters. Have you had this headache for more than 24 hours, and do you have any red-flag symptoms like vision changes, fever, vomiting, weakness, or confusion?'
  }
  return '[URGENCY:NON-URGENT] Thanks for sharing. This may be non-urgent, but you should still check with a clinician, especially if symptoms continue. How long have you had these symptoms?'
}

export async function triageChat(messages) {
  const useMock = import.meta.env.VITE_USE_MOCK_TRIAGE === 'true'
  if (useMock) return mockTriageReply(messages)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing API key. Add VITE_GEMINI_API_KEY to your .env and restart the dev server.')
  }
  if (!apiKey.startsWith('AIza')) {
    throw new Error('Your VITE_GEMINI_API_KEY looks invalid. Gemini keys usually start with "AIza".')
  }

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    }),
  })

  if (!res.ok) {
    let details = null
    try {
      details = await res.json()
    } catch {
      // ignore parse errors
    }
    const msg =
      details?.error?.message ||
      details?.message ||
      `Gemini API error (${res.status}).`
    throw new Error(msg)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim()
  if (!text) throw new Error('Gemini returned an empty response.')
  return text
}

export function parseUrgency(text) {
  if (text.includes('[URGENCY:EMERGENCY]')) return 'EMERGENCY'
  if (text.includes('[URGENCY:URGENT]')) return 'URGENT'
  if (text.includes('[URGENCY:NON-URGENT]')) return 'NON-URGENT'
  return null
}

export function cleanText(text) {
  return text.replace(/\[URGENCY:[A-Z-]+\]/g, '').trim()
}

const URGENCY_RANK = { EMERGENCY: 3, URGENT: 2, 'NON-URGENT': 1 }

/** If a later reply raises urgency (e.g. new symptoms), upgrade the banner. */
export function mergeUrgencyLevel(previous, detected) {
  if (!detected) return previous ?? null
  if (!previous) return detected
  const next = URGENCY_RANK[detected] ?? 0
  const prev = URGENCY_RANK[previous] ?? 0
  return next > prev ? detected : previous
}

