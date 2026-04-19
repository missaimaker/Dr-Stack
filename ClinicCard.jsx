import { MapPin, Phone, ExternalLink } from 'lucide-react'

export default function ClinicCard({ clinic }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-semibold text-sm text-stone-800 leading-tight">{clinic.name}</h4>
        {clinic.distance && (
          <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full shrink-0 font-medium">
            {clinic.distance}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {clinic.address && (
          <div className="flex items-start gap-1.5 text-xs text-stone-500">
            <MapPin size={12} className="mt-0.5 shrink-0 text-teal-600" />
            <span>{clinic.address}</span>
          </div>
        )}
        {clinic.phone && (
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Phone size={12} className="shrink-0 text-teal-600" />
            <a href={`tel:${clinic.phone}`} className="hover:text-teal-700 underline">{clinic.phone}</a>
          </div>
        )}
      </div>
      {clinic.url && (
        <a
          href={clinic.url.startsWith('http') ? clinic.url : `https://${clinic.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-teal-600 hover:text-teal-800 font-medium"
        >
          Visit website <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}
