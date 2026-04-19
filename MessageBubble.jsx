import { Heart } from 'lucide-react'

function renderContent(text) {
  const blocks = text.split(/\n+/).filter(Boolean)
  return blocks.map((block, bi) => {
    const parts = block.split(/(\*\*[^*]+\*\*)/)
    const line = parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    )
    return (
      <p key={bi} className={bi > 0 ? 'mt-2' : ''}>
        {line}
      </p>
    )
  })
}

export default function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} msg-enter`}
      role="article"
      aria-label={isUser ? 'You said' : 'Dr. Stack said'}
    >
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center mr-2 shrink-0 mt-1"
          aria-hidden
        >
          <Heart size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[min(78%,28rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-sm'
            : 'bg-white border border-stone-100 text-stone-800 rounded-tl-sm shadow-sm'
        }`}
      >
        {renderContent(msg.content)}
      </div>
    </div>
  )
}
