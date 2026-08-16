'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bug, Flag, Inbox, MessageSquare } from 'lucide-react'
import type { BugReport } from '@/app/actions/bugs'
import type { Rapport } from '@/app/actions/reports'
import type { Feedback } from '@/app/actions/feedback'
import { BugsLijst } from './bugs-lijst'
import { RapportenLijst } from './rapporten-lijst'
import { FeedbackLijst } from './feedback-lijst'
import { parseMeldingTab, type MeldingTab } from './melding-tab'

type Props = {
  bugs: BugReport[]
  rapporten: Rapport[]
  feedback: Feedback[]
  initialTab: MeldingTab
}

const TABS: { id: MeldingTab; label: string; icon: typeof Bug }[] = [
  { id: 'bugs', label: 'Bugs', icon: Bug },
  { id: 'rapporten', label: 'Rapporten', icon: Flag },
]

export function MeldingenTabs({ bugs, rapporten, feedback, initialTab }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<MeldingTab>(initialTab)
  const [focusFeedback, setFocusFeedback] = useState(false)

  useEffect(() => {
    const raw = window.location.hash.replace('#', '')
    const fromHash = parseMeldingTab(raw)
    if (!fromHash) return

    const naarFeedback = raw === 'feedback'
    window.history.replaceState(
      null,
      '',
      naarFeedback ? '/meldingen?tab=rapporten#feedback' : `/meldingen?tab=${fromHash}`,
    )
    queueMicrotask(() => {
      setTab(fromHash)
      if (naarFeedback) setFocusFeedback(true)
    })
  }, [])

  useEffect(() => {
    if (!focusFeedback || tab !== 'rapporten') return
    document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    queueMicrotask(() => setFocusFeedback(false))
  }, [focusFeedback, tab])

  function selectTab(next: MeldingTab) {
    setTab(next)
    router.replace(`/meldingen?tab=${next}`, { scroll: false })
  }

  const bugsNieuw = bugs.filter(b => b.status === 'nieuw').length
  const rapportenNieuw = rapporten.filter(r => r.status === 'nieuw').length
  const feedbackNieuw = feedback.filter(f => f.status === 'nieuw').length
  const nieuwPerTab: Record<MeldingTab, number> = {
    bugs: bugsNieuw,
    rapporten: rapportenNieuw + feedbackNieuw,
  }
  const aantalNieuw = bugsNieuw + rapportenNieuw + feedbackNieuw
  const aantalTotaal = bugs.length + rapporten.length + feedback.length

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-gray-800 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Inbox className="w-5 h-5 text-gray-400" />
          <h1 className="text-xl font-display text-white">Meldingen</h1>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {aantalNieuw > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              {aantalNieuw} nieuw
            </span>
          )}
          <span className="text-sm text-gray-500">{aantalTotaal} totaal</span>
        </div>
      </div>

      <div className="px-8 pt-5">
        <div className="flex items-center gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => {
            const actief = tab === id
            const nieuw = nieuwPerTab[id]
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  actief
                    ? 'bg-opstap-orange-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {nieuw > 0 && (
                  <span
                    className={`text-xs rounded-full px-1.5 py-0.5 ${
                      actief ? 'bg-white/20 text-white' : 'bg-orange-500 text-white'
                    }`}
                  >
                    {nieuw}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {tab === 'bugs' && <BugsLijst bugs={bugs} />}
        {tab === 'rapporten' && (
          <div className="flex flex-col gap-10">
            <section>
              <div className="flex items-center gap-2 mb-1">
                <Flag className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-white">Rapporten</h2>
                {rapportenNieuw > 0 && (
                  <span className="text-xs rounded-full px-1.5 py-0.5 bg-orange-500 text-white">
                    {rapportenNieuw}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-5">Meldingen over andere gebruikers</p>
              <RapportenLijst rapporten={rapporten} />
            </section>

            <section id="feedback">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-white">Feedback</h2>
                {feedbackNieuw > 0 && (
                  <span className="text-xs rounded-full px-1.5 py-0.5 bg-orange-500 text-white">
                    {feedbackNieuw}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-5">Ideeën en opmerkingen van gebruikers</p>
              <FeedbackLijst feedback={feedback} />
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
