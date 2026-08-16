import { redirect } from 'next/navigation'

export default function BugsPage() {
  redirect('/meldingen?tab=bugs')
}
