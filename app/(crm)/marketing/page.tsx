'use client'

import { PublicationsCalendar } from '@/components/publications/publications-calendar'
import { ProjectHeader } from '@/components/sidebar-dash-client'

export default function MarketingPage() {
  return (
    <>
      <ProjectHeader title="Marketing" subtitle="Calendrier de publication" />
      <div className="flex-1 p-6 lg:p-8">
        <PublicationsCalendar />
      </div>
    </>
  )
}
