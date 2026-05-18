import { SidebarDashClient } from '@/components/sidebar-dash-client'
import { Suspense } from 'react'

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Suspense fallback={
        <div style={{ width: 220, minHeight: '100vh', borderRight: '1px solid var(--color-border)', background: 'var(--color-bg-sidebar)', flexShrink: 0 }} />
      }>
        <SidebarDashClient />
      </Suspense>
      <main className="main-dash flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
