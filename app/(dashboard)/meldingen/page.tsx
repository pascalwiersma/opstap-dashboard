import { getCurrentUser } from '@/lib/supabase-server'
import { eersteToegestanePad, kan } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { getBugReports } from '@/app/actions/bugs'
import { getRapporten } from '@/app/actions/reports'
import { getFeedback } from '@/app/actions/feedback'
import { MeldingenTabs } from './_components/meldingen-tabs'
import { parseMeldingTab } from './_components/melding-tab'

export default async function MeldingenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getCurrentUser()
  if (!user || !kan(user, 'meldingen', 'zien')) redirect(user ? eersteToegestanePad(user) : '/')

  const { tab } = await searchParams
  const [bugs, rapporten, feedback] = await Promise.all([
    getBugReports(),
    getRapporten(),
    getFeedback(),
  ])

  return (
    <MeldingenTabs
      bugs={bugs}
      rapporten={rapporten}
      feedback={feedback}
      initialTab={parseMeldingTab(tab) ?? 'bugs'}
    />
  )
}
