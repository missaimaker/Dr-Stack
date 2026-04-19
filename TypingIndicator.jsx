import { Heart } from 'lucide-react'

export default function TypingIndicator() {
  return (
    <div className="flex justify-start items-center gap-2 msg-enter" aria-live="polite" aria-label="Dr. Stack is typing">
      <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center shrink-0" aria-hidden>
        <Heart size={14} className="text-white" />
      </div>
      <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
        <span className="dot w-2 h-2 bg-teal-400 rounded-full inline-block" />
        <span className="dot w-2 h-2 bg-teal-400 rounded-full inline-block" />
        <span className="dot w-2 h-2 bg-teal-400 rounded-full inline-block" />
      </div>
    </div>
  )
}
