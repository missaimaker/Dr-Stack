export default function UrgencyBadge({ level }) {
  if (!level) return null

  const config = {
    EMERGENCY: {
      label: 'Emergency — Call 911 Now',
      bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700',
      sub: 'Go to the nearest emergency room or call 911 immediately.',
    },
    URGENT: {
      label: 'Urgent Care Needed',
      bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700',
      sub: 'Visit an urgent care clinic or free health center within 24 hours.',
    },
    'NON-URGENT': {
      label: 'Non-Urgent',
      bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
      sub: 'Schedule an appointment at a free clinic or try telehealth.',
    },
  }

  const c = config[level]
  if (!c) return null

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 msg-enter shadow-sm`}>
      <p className={`font-semibold text-sm ${c.text}`}>{c.label}</p>
      <p className="text-xs text-slate-600 mt-1">{c.sub}</p>
    </div>
  )
}