function mockClinics(zipCode) {
  return [
    {
      name: 'Community Care Clinic',
      address: `Near ${zipCode}, Austin, TX`,
      phone: '(512) 555-0110',
      distance: '2.1 mi',
      url: 'https://findahealthcenter.hrsa.gov',
    },
    {
      name: 'People First Health Center',
      address: `Near ${zipCode}, Austin, TX`,
      phone: '(512) 555-0142',
      distance: '4.8 mi',
      url: 'https://findahealthcenter.hrsa.gov',
    },
    {
      name: 'Neighborhood Family Clinic',
      address: `Near ${zipCode}, Austin, TX`,
      phone: '(512) 555-0175',
      distance: '6.2 mi',
      url: 'https://findahealthcenter.hrsa.gov',
    },
  ]
}

export async function findClinics(zipCode) {
  const useMock = import.meta.env.VITE_USE_MOCK_CLINICS === 'true'
  if (useMock) {
    return {
      clinics: mockClinics(zipCode),
      error: null,
    }
  }

  const url = `https://findahealthcenter.hrsa.gov/api/findahealthcenter?zip=${encodeURIComponent(zipCode)}&radius=25&pageNumber=1&pageSize=8`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return {
        clinics: [],
        error: 'The clinic directory is temporarily unavailable right now. Try again in a moment.',
      }
    }
    const data = await res.json()
    return {
      clinics: (data.data || []).map(c => ({
        name: c.siteName || c.bhcmisName,
        address: `${c.siteAddress1}, ${c.siteCity}, ${c.siteStateAbbreviation} ${c.siteZip}`,
        phone: c.sitePhoneNumber,
        distance: c.distance ? `${parseFloat(c.distance).toFixed(1)} mi` : null,
        url: c.siteWebAddress,
      })),
      error: null,
    }
  } catch (e) {
    console.warn('Clinic lookup failed:', e.message)
    return {
      clinics: [],
      error: 'Could not load clinics from this browser/network. Try again, switch network, or use findahealthcenter.hrsa.gov directly.',
    }
  }
}
