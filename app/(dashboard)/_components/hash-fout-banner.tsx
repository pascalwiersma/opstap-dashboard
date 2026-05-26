'use client'

import { useEffect, useState } from 'react'
import { TriangleAlert, X } from 'lucide-react'

const FOUT_LABELS: Record<string, string> = {
  otp_expired: 'Uitnodigingslink is verlopen. Vraag een nieuwe aan bij de admin.',
  access_denied: 'Toegang geweigerd via de link.',
}

export function HashFoutBanner() {
  const [bericht, setBericht] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.slice(1))
    const errorCode = params.get('error_code')
    const errorDesc = params.get('error_description')

    if (params.get('error')) {
      const label = (errorCode && FOUT_LABELS[errorCode]) ||
        errorDesc?.replace(/\+/g, ' ') ||
        'Er is een fout opgetreden via de link.'
      setBericht(label)
      // Verwijder de hash uit de URL zonder herlaad
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  if (!bericht) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm rounded-xl shadow-lg max-w-md">
      <TriangleAlert className="w-4 h-4 shrink-0" />
      <span className="flex-1">{bericht}</span>
      <button onClick={() => setBericht('')} className="text-amber-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
