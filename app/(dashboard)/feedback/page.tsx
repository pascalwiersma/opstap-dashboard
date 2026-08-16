import { redirect } from 'next/navigation'

export default function FeedbackPage() {
  redirect('/meldingen?tab=feedback')
}
