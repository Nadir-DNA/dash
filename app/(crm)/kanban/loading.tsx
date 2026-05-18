import { Skeleton } from '@/components/ui/skeleton'

export default function KanbanLoading() {
  return (
    <div className="p-6 lg:p-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton className="h-8 w-40" />
      <div style={{ display: 'flex', gap: 12, overflowX: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton className="h-10 rounded-lg" />
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
              <Skeleton key={j} className="h-20 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
