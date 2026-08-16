'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function TotpQrGeheim({ secret, qrDataUrl }: { secret: string; qrDataUrl: string }) {
  const [gekopieerd, setGekopieerd] = useState(false)

  async function kopieerSecret() {
    await navigator.clipboard.writeText(secret)
    setGekopieerd(true)
    window.setTimeout(() => setGekopieerd(false), 2000)
  }

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        alt="TOTP QR-code"
        className="w-60 h-60 rounded-xl bg-white p-2"
      />
      <div>
        <p className="text-xs font-medium text-gray-400 mb-1.5">Geheime code</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white tracking-wider break-all">
            {secret}
          </code>
          <button
            type="button"
            onClick={kopieerSecret}
            className="shrink-0 p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
            title="Kopiëren"
          >
            {gekopieerd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Deze code wordt alleen nu getoond. Daarna moet je opnieuw genereren.
        </p>
      </div>
    </div>
  )
}
