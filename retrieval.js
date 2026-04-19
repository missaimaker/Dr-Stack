const KNOWLEDGE_BASE = [
  {
    id: 'headache',
    title: 'Headache Triage',
    triggers: ['headache', 'migraine', 'head pain'],
    careNotes:
      'Most headaches are not emergencies, but persistent or worsening pain should be evaluated. Ask about duration, severity, and associated symptoms.',
    redFlags:
      'Emergency red flags: thunderclap onset, neurologic deficits, confusion, vision loss, neck stiffness with fever, repeated vomiting, or new severe headache after head injury.',
    followUp:
      'Ask one follow-up: duration, severity (1-10), and whether neurologic symptoms are present.',
  },
  {
    id: 'respiratory',
    title: 'Respiratory / Viral Symptoms',
    triggers: [
      'covid',
      'corona',
      'coronavirus',
      'fever',
      'cough',
      'sore throat',
      'flu',
      'chills',
      'congestion',
    ],
    careNotes:
      'For mild viral symptoms, supportive care can be discussed while recommending testing and hydration guidance.',
    redFlags:
      'Emergency red flags: shortness of breath at rest, chest pain, confusion, bluish lips/face, or dehydration symptoms.',
    followUp:
      'Ask one follow-up: duration, breathing status, and hydration/tolerance of fluids.',
  },
  {
    id: 'abdominal',
    title: 'Abdominal Pain / GI',
    triggers: [
      'stomach pain',
      'abdominal pain',
      'nausea',
      'vomiting',
      'diarrhea',
      'belly pain',
    ],
    careNotes:
      'Assess hydration and severity. Persistent GI symptoms may require in-person evaluation.',
    redFlags:
      'Emergency red flags: severe constant pain, rigid abdomen, blood in stool/vomit, black stool, persistent vomiting with inability to keep fluids, fainting.',
    followUp:
      'Ask one follow-up: pain location/severity and ability to keep fluids down.',
  },
  {
    id: 'chest-breathing',
    title: 'Chest Pain / Breathing',
    triggers: [
      'chest pain',
      'pressure in chest',
      'shortness of breath',
      'trouble breathing',
      'can’t breathe',
    ],
    careNotes:
      'These symptoms need immediate escalation and emergency advice, not routine clinic follow-up.',
    redFlags: 'Treat as emergency by default; advise calling 911 now.',
    followUp: 'Do not delay with multiple questions before emergency guidance.',
  },
  {
    id: 'mental-health',
    title: 'Mental Health Distress',
    triggers: ['panic', 'anxiety', 'depressed', 'suicidal', 'self harm', 'self-harm'],
    careNotes:
      'Use supportive language and strongly encourage immediate professional help where safety concerns exist.',
    redFlags:
      'Emergency red flags: suicidal intent, plans for self-harm, or inability to stay safe.',
    followUp:
      'Ask one safety-focused follow-up and provide crisis/emergency options immediately if risk is present.',
  },
]

function scoreTopic(text, topic) {
  let score = 0
  for (const trigger of topic.triggers) {
    if (text.includes(trigger)) score += 1
  }
  return score
}

export function detectTopTopics(messages, maxTopics = 3) {
  const text = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return []

  const ranked = KNOWLEDGE_BASE.map(topic => ({
    id: topic.id,
    title: topic.title,
    score: scoreTopic(text, topic),
  }))
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTopics)

  return ranked
}

export function buildRetrievedContext(messages, maxTopics = 3) {
  const top = detectTopTopics(messages, maxTopics)
  const details = top
    .map(t => KNOWLEDGE_BASE.find(k => k.id === t.id))
    .filter(Boolean)

  if (details.length === 0) {
    return {
      topics: [],
      contextText:
        'No high-confidence topic match found. Use general triage flow: clarify symptoms, duration, severity, and emergency red flags.',
    }
  }

  const contextText = details
    .map(
      topic =>
        `- ${topic.title}\n  - Notes: ${topic.careNotes}\n  - Red flags: ${topic.redFlags}\n  - Follow-up: ${topic.followUp}`
    )
    .join('\n')

  return {
    topics: details.map(t => t.title),
    contextText,
  }
}
