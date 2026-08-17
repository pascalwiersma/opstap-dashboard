'use client'

import { useState } from 'react'
import {
  COMMUNITY_RICHTLIJNEN,
  RICHTLIJN_GROEP_IDS,
  groepLabel,
  richtlijnLabel,
  type RichtlijnTaal,
} from '@/lib/community-richtlijnen'

const invoer = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500'

export function RichtlijnRedenVelden({
  code,
  onCode,
  toelichting,
  onToelichting,
  idPrefix = 'richtlijn',
}: {
  code: string
  onCode: (code: string) => void
  toelichting: string
  onToelichting: (waarde: string) => void
  idPrefix?: string
}) {
  const [taal, setTaal] = useState<RichtlijnTaal>('nl')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`${idPrefix}-code`} className="block text-xs text-gray-400">
          {taal === 'nl' ? 'Regel uit de community richtlijnen' : 'Rule from the community guidelines'}
        </label>
        <div className="inline-flex rounded-md border border-gray-700 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setTaal('nl')}
            className={`px-2 py-1 ${taal === 'nl' ? 'bg-opstap-orange-500/20 text-opstap-orange-300' : 'text-gray-400 hover:text-white'}`}
          >
            NL
          </button>
          <button
            type="button"
            onClick={() => setTaal('en')}
            className={`px-2 py-1 border-l border-gray-700 ${taal === 'en' ? 'bg-opstap-orange-500/20 text-opstap-orange-300' : 'text-gray-400 hover:text-white'}`}
          >
            EN
          </button>
        </div>
      </div>
      <select
        id={`${idPrefix}-code`}
        value={code}
        onChange={e => onCode(e.target.value)}
        className={invoer}
      >
        <option value="">{taal === 'nl' ? 'Kies een regel…' : 'Choose a rule…'}</option>
        {RICHTLIJN_GROEP_IDS.map(groepId => (
          <optgroup key={groepId} label={groepLabel(groepId, taal)}>
            {COMMUNITY_RICHTLIJNEN.filter(r => r.groepId === groepId).map(r => (
              <option key={r.code} value={r.code}>
                {richtlijnLabel(r, taal)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <textarea
        value={toelichting}
        onChange={e => onToelichting(e.target.value)}
        placeholder={taal === 'nl' ? 'Toelichting voor het lid (optioneel)' : 'Note for the member (optional)'}
        rows={3}
        className={invoer}
      />
      <p className="text-[11px] text-gray-500">
        {taal === 'nl'
          ? 'Er wordt alleen de regelcode opgeslagen; het lid ziet de tekst in de taal van de app.'
          : 'Only the rule code is stored; the member sees the text in their app language.'}
      </p>
    </div>
  )
}
