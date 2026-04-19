import { MapPin, Phone, ExternalLink } from 'lucide-react'

export default function ClinicCard({ clinic }) {
  return (
    <div className="bg-[#fffaf2] border border-[#e9dcc7] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-semibold text-sm text-slate-900 leading-tight">{clinic.name}</h4>
        {clinic.distance && (
          <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full shrink-0 font-medium border border-amber-200">
            {clinic.distance}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {clinic.address && (
          <div className="flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin size={12} className="mt-0.5 shrink-0 text-amber-700" />
            <span>{clinic.address}</span>
          </div>
        )}
        {clinic.phone && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Phone size={12} className="shrink-0 text-amber-700" />
            <a href={`tel:${clinic.phone}`} className="hover:text-amber-800 underline">{clinic.phone}</a>
          </div>
        )}
      </div>
      {clinic.url && (
        <a
          href={clinic.url.startsWith('http') ? clinic.url : `https://${clinic.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-amber-700 hover:text-amber-800 font-medium"
        >
          Visit website <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}
