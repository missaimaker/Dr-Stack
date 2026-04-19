function mockTriageReply(messages) {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase())
  const lastUser = userMessages[userMessages.length - 1] || ''
  const fullUserContext = userMessages.join(' ')
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || ''
  const emergencyPattern =
    /\b(chest pain|trouble breathing|shortness of breath|difficulty (in )?breathing|can't breathe|cannot breathe|breathless|stroke|fainted)\b/
  const urgentHints = ['fever', 'vomit', 'infection', 'severe pain', 'blood', 'shivering']
  const redFlagHints = ['neck stiffness', 'vision changes', 'confusion', 'weakness', 'numbness']
  const hasHeadache = fullUserContext.includes('headache') || fullUserContext.includes('migraine')
  const mentionsDuration =
    /\b(\d+)\s*(day|days|week|weeks|month|months)\b/i.test(lastUser) ||
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks)\b/i.test(lastUser)
  const askedHowLong =
    lastAssistant.includes('how long have') ||
    lastAssistant.includes('how long') ||
    lastAssistant.includes('how many days')
  const hasRespiratoryVirus = /\b(covid|corona|coronavirus|rona|covid-19|covid19)\b/.test(fullUserContext)
  const mentionsWorsening = /worse|worsening|getting worse|severe/.test(lastUser)
  const isYes = /^(y|yes|yeah|yep|sure|i do|they do|i have|they have)\b/.test(lastUser.trim())
  const isNo = /^(n|no|nope|nah|not really|i don't|dont|they don't|they dont)\b/.test(lastUser.trim())
  const isAcknowledgement = /^(ok|okay|thanks|thank you|got it|alright)\b/.test(lastUser.trim())
  const answeredSymptomPromptWithBreathing =
    lastAssistant.includes('what symptom is bothering you most') && /\b(breath|breathing)\b/.test(lastUser)

  if (emergencyPattern.test(lastUser) || answeredSymptomPromptWithBreathing) {
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

  // User answered "how long?" — don't repeat the same question.
  if (askedHowLong && mentionsDuration) {
    const longCourse =
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(week|weeks|month|months)\b/i.test(lastUser) ||
      /\b(4|four)\s*weeks?\b/i.test(lastUser)
    if (hasRespiratoryVirus || longCourse) {
      return '[URGENCY:NON-URGENT] Thanks—that context helps. I can’t diagnose COVID-19 here, but symptoms lasting weeks are worth a clinician visit for guidance and testing. Seek emergency care for trouble breathing, chest pain, confusion, or bluish lips. Right now: do you have fever, cough, or shortness of breath?'
    }
    return '[URGENCY:NON-URGENT] Got it. If anything gets suddenly worse (breathing, chest pain, confusion), seek emergency care. Otherwise, what symptom is bothering you most today?'
  }

  // COVID/corona — clearer first reply than the generic fallback.
  if (hasRespiratoryVirus && !askedHowLong) {
    return '[URGENCY:NON-URGENT] Thanks for sharing. I can’t diagnose COVID-19 from chat. How long have you had symptoms, and do you currently have fever, cough, or trouble breathing?'
  }

  return '[URGENCY:NON-URGENT] Thanks for sharing. This may be non-urgent, but you should still check with a clinician, especially if symptoms continue. How long have you had these symptoms?'
}

export async function triageChat(messages) {
  const useMock = import.meta.env.VITE_USE_MOCK_TRIAGE === 'true'
  if (useMock) {
    return {
      reply: mockTriageReply(messages),
      degraded: true,
      degradedReason: 'mock_mode',
    }
  }
  const res = await fetch('/api/triage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
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
      details?.error ||
      details?.message ||
      `Triage API error (${res.status}).`
    throw new Error(msg)
  }

  const data = await res.json()
  const text = data?.reply?.trim?.()
  if (!text) throw new Error('Gemini returned an empty response.')
  return {
    reply: text,
    degraded: Boolean(data?.degraded),
    degradedReason: data?.degradedReason || null,
  }
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

