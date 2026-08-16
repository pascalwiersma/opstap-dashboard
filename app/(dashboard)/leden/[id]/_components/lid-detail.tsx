'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { LidDetail as Lid } from '@/app/actions/leden'
import { banLid, unbanLid, waarschuwLid, verwijderLid } from '@/app/actions/leden'
import { Ban, Loader2, ShieldAlert, Trash2 } from 'lucide-react'

const invoer = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500'

function formatDatum(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Rij({ label, waarde }: { label: string; waarde: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-800/80 last:border-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-200 break-words">{waarde || '—'}</dd>
    </div>
  )
}

function Kaart({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-3">{titel}</h2>
      {children}
    </section>
  )
}

export function LidDetail({
  lid,
  kanBewerken,
  kanVerwijderen,
  huidigeUserId,
}: {
  lid: Lid
  kanBewerken: boolean
  kanVerwijderen: boolean
  huidigeUserId: string
}) {
  const router = useRouter()
  const [reden, setReden] = useState('')
  const [detail, setDetail] = useState('')
  const [bezig, setBezig] = useState('')
  const [fout, setFout] = useState('')
  const [ok, setOk] = useState('')

  async function run(naam: string, actie: () => Promise<void>, daarna?: () => void) {
    setBezig(naam)
    setFout('')
    setOk('')
    try {
      await actie()
      daarna?.()
      router.refresh()
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Actie mislukt.')
    } finally {
      setBezig('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {lid.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lid.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover bg-gray-800" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xl font-semibold">
            {lid.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-display text-white">{lid.name}</h1>
          <p className="text-sm text-gray-400">
            {lid.username ? `@${lid.username}` : 'geen username'}
            {lid.age != null ? ` · ${lid.age}` : ''}
            {lid.provincie ? ` · ${lid.provincie}` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {lid.is_banned && (
              <span className="text-xs px-2 py-0.5 rounded border border-red-800/50 text-red-400 bg-red-950/40">Geband</span>
            )}
            {lid.identity_verified && (
              <span className="text-xs px-2 py-0.5 rounded border border-emerald-800/50 text-emerald-400 bg-emerald-950/40">Geverifieerd</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400">{lid.verification_status}</span>
            {lid.is_test_account && (
              <span className="text-xs px-2 py-0.5 rounded border border-sky-800/50 text-sky-300">Testaccount</span>
            )}
            {lid.dashboard_role && (
              <span className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400">Team · {lid.dashboard_role}</span>
            )}
          </div>
        </div>
      </div>

      {fout && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">{fout}</p>}
      {ok && <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-4 py-3">{ok}</p>}

      <div className="grid lg:grid-cols-2 gap-6">
        <Kaart titel="Profiel">
          <dl>
            <Rij label="E-mail (profiel)" waarde={lid.email} />
            <Rij label="E-mail (auth)" waarde={lid.auth_email} />
            <Rij label="Telefoon" waarde={lid.phone} />
            <Rij label="Geslacht" waarde={lid.gender} />
            <Rij label="Geboortedatum" waarde={lid.birth_date} />
            <Rij label="Roken" waarde={lid.smoking} />
            <Rij label="Groepsgrootte" waarde={lid.preferred_group_size} />
            <Rij label="Radius km" waarde={lid.preferred_travel_radius_km} />
            <Rij label="Bio" waarde={lid.bio} />
            <Rij label="Trust" waarde={lid.trust_score} />
            <Rij label="App-rol" waarde={lid.role} />
            <Rij label="Aangemaakt" waarde={formatDatum(lid.created_at)} />
            <Rij label="Laatst gezien" waarde={formatDatum(lid.last_seen_at)} />
            <Rij label="Onboarding" waarde={formatDatum(lid.onboarding_completed_at)} />
            <Rij label="Geverifieerd op" waarde={formatDatum(lid.identity_verified_at)} />
            <Rij label="Push" waarde={lid.heeft_push_token ? 'Ja' : 'Nee'} />
            <Rij label="ID" waarde={<span className="font-mono text-xs">{lid.id}</span>} />
          </dl>
        </Kaart>

        <Kaart titel="Moderatie">
          {!kanBewerken ? (
            <p className="text-sm text-gray-500">Je mag geen moderatie-acties uitvoeren.</p>
          ) : (
            <div className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  void run('waarschuw', async () => {
                    await waarschuwLid(lid.id, reden, detail)
                    setReden('')
                    setDetail('')
                    setOk('Waarschuwing verstuurd.')
                  })
                }}
                className="space-y-2"
              >
                <input value={reden} onChange={e => setReden(e.target.value)} placeholder="Reden (verplicht)" className={invoer} />
                <textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="Toelichting (optioneel)" rows={3} className={invoer} />
                <button
                  type="submit"
                  disabled={!!bezig || !reden.trim()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-600/30 text-sm disabled:opacity-50"
                >
                  {bezig === 'waarschuw' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  Waarschuwen
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {lid.is_banned ? (
                  <button
                    type="button"
                    disabled={!!bezig}
                    onClick={() => void run('unban', () => unbanLid(lid.id), () => setOk('Ban opgeheven.'))}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 text-sm"
                  >
                    Ban opheffen
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!!bezig || lid.id === huidigeUserId}
                    onClick={() => {
                      if (!confirm(`Ban ${lid.name}? Die persoon kan daarna niet meer matchen of de app gebruiken.`)) return
                      void run('ban', () => banLid(lid.id), () => setOk('Gebruiker geband.'))
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30 text-sm"
                  >
                    <Ban className="w-4 h-4" />
                    Bannen
                  </button>
                )}
                {kanVerwijderen && lid.id !== huidigeUserId && (
                  <button
                    type="button"
                    disabled={!!bezig}
                    onClick={() => {
                      if (!confirm(`Account van ${lid.name} permanent verwijderen? Dit kan niet terug.`)) return
                      void run('verwijder', async () => {
                        await verwijderLid(lid.id)
                        router.push('/leden')
                      })
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-red-400 border border-gray-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Account verwijderen
                  </button>
                )}
              </div>
            </div>
          )}
        </Kaart>
      </div>

      {lid.fotos.length > 0 && (
        <Kaart titel="Foto's">
          <div className="flex flex-wrap gap-3">
            {lid.fotos.map(f => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={f.photo_url} alt="" className="w-24 h-24 rounded-lg object-cover bg-gray-800" />
            ))}
          </div>
        </Kaart>
      )}

      <Kaart titel="Interesses">
        {lid.interesses.length === 0 ? (
          <p className="text-sm text-gray-500">Geen interesses.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lid.interesses.map(i => (
              <span key={i.id} className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-300 border border-gray-700">
                {i.name}
              </span>
            ))}
          </div>
        )}
      </Kaart>

      <div className="grid lg:grid-cols-2 gap-6">
        <Kaart titel="Rapporten">
          {lid.rapporten.length === 0 ? (
            <p className="text-sm text-gray-500">Geen rapporten.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lid.rapporten.map(r => (
                <li key={`${r.kant}-${r.id}`} className="border-b border-gray-800 pb-2">
                  <p className="text-gray-200">{r.reason}</p>
                  <p className="text-xs text-gray-500">
                    {r.kant === 'gemeld' ? 'Gemeld door' : 'Heeft gemeld'}{' '}
                    {r.andere.id ? (
                      <Link href={`/leden/${r.andere.id}`} className="text-opstap-orange-300 hover:underline">
                        {r.andere.name ?? r.andere.username ?? 'onbekend'}
                      </Link>
                    ) : 'onbekend'}
                    {' · '}{r.status} · {formatDatum(r.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Kaart>
        <Kaart titel="Waarschuwingen">
          {lid.waarschuwingen.length === 0 ? (
            <p className="text-sm text-gray-500">Geen waarschuwingen.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lid.waarschuwingen.map(w => (
                <li key={w.id} className="border-b border-gray-800 pb-2">
                  <p className="text-gray-200">{w.reason}</p>
                  {w.detail && <p className="text-xs text-gray-400">{w.detail}</p>}
                  <p className="text-xs text-gray-500">
                    {formatDatum(w.created_at)}
                    {w.read_at ? ' · gelezen' : ' · ongelezen'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Kaart>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Kaart titel="Blokkades">
          {lid.blokken.length === 0 ? (
            <p className="text-sm text-gray-500">Geen blokkades.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lid.blokken.map(b => (
                <li key={b.id} className="text-gray-300">
                  {b.kant === 'heeft_geblokkeerd' ? 'Heeft geblokkeerd: ' : 'Geblokkeerd door: '}
                  {b.andere.id ? (
                    <Link href={`/leden/${b.andere.id}`} className="text-opstap-orange-300 hover:underline">
                      {b.andere.name ?? b.andere.username ?? 'onbekend'}
                    </Link>
                  ) : 'onbekend'}
                  <span className="text-xs text-gray-500"> · {formatDatum(b.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Kaart>
        <Kaart titel="Check-ins">
          {lid.checkIns.length === 0 ? (
            <p className="text-sm text-gray-500">Geen check-ins.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-300">
              {lid.checkIns.map(c => (
                <li key={c.id}>
                  {c.date} · {c.status ?? '—'} · {c.event ?? c.gebied ?? '—'}
                </li>
              ))}
            </ul>
          )}
        </Kaart>
      </div>

      <Kaart titel="Matches">
        {lid.matches.length === 0 ? (
          <p className="text-sm text-gray-500">Geen matches.</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-300">
            {lid.matches.map(m => (
              <li key={m.id}>
                {m.date} · {m.status} · reactie {m.response ?? '—'}
                {m.verified_attendance != null && ` · aanwezig ${m.verified_attendance ? 'ja' : 'nee'}`}
              </li>
            ))}
          </ul>
        )}
      </Kaart>
    </div>
  )
}
