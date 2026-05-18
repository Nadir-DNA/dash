import { Skeleton } from '@/components/ui/skeleton'

export default function CRMLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}
