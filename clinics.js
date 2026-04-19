export async function findClinics(zipCode) {
  const url = `/api/clinics?zip=${encodeURIComponent(zipCode)}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      const details = await res.json().catch(() => ({}))
      return {
        clinics: [],
        error:
          details?.error ||
          'The clinic directory is temporarily unavailable right now. Try again in a moment.',
      }
    }
    const data = await res.json()
    return {
      clinics: data.clinics || [],
      error: data.warning || null,
    }
  } catch (e) {
    console.warn('Clinic lookup failed:', e.message)
    return {
      clinics: [],
      error: 'Could not load clinics from this browser/network. Try again, switch network, or use findahealthcenter.hrsa.gov directly.',
    }
  }
}
