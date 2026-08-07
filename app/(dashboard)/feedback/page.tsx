import { getCurrentUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getFeedback } from '@/app/actions/feedback'
import { FeedbackLijst } from './_components/feedback-lijst'
import { MessageSquare } from 'lucide-react'

export default async function FeedbackPage() {
  const user = await getCurrentUser()
  if (!user || user.role === 'provincial' || user.role === 'marketing') redirect('/')

  const feedback = await getFeedback()
  const aantalNieuw = feedback.filter(f => f.status === 'nieuw').length

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-gray-800 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h1 className="text-xl font-display text-white">Feedback</h1>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {aantalNieuw > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              {aantalNieuw} nieuw
            </span>
          )}
          <span className="text-sm text-gray-500">{feedback.length} totaal</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <FeedbackLijst feedback={feedback} />
      </div>
    </div>
  )
}
