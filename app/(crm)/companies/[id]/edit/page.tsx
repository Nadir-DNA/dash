import { createClient } from '@/lib/trailbase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { updateCompany } from '@/app/actions/companies'
import { CompanyForm } from '@/components/company-form'

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createClient()
  let company: Record<string, unknown> | null = null
  try {
    company = await client.records('companies').read(id) as Record<string, unknown>
  } catch {
    notFound()
  }
  if (!company) notFound()

  const action = updateCompany.bind(null, id)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/companies" className="hover:text-foreground transition-colors">Companies</Link>
          <span>/</span>
          <Link href={`/companies/${id}`} className="hover:text-foreground transition-colors">{company.name}</Link>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Modifier {company.name}</h1>
        </div>
      </div>
      <CompanyForm action={action} company={company} cancelHref={`/companies/${id}`} />
    </div>
  )
}
