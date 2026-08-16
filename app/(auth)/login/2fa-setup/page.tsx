import { startTotpSetup } from '@/app/actions/totp'
import { redirect } from 'next/navigation'
import { TotpSetupForm } from './_components/totp-setup-form'

export default async function TotpSetupPage() {
  const resultaat = await startTotpSetup()
  if ('alIngeschakeld' in resultaat) redirect('/')
  return <TotpSetupForm enrollment={resultaat} />
}
