import { createClient } from '@/lib/trailbase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { createContact } from '@/app/actions/contacts'
import { ContactForm } from '@/components/contact-form'

export default async function NewContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createClient()

  let company: Record<string, unknown> | null = null
  let allCompanies: Record<string, unknown>[] = []
  try {
    company = await client.records('companies').read(id) as Record<string, unknown>
    const companiesRes = await client.records('companies').list({ order: ['name'] })
    allCompanies = companiesRes.records ?? []
  } catch {
    notFound()
  }

  if (!company) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/companies" className="hover:text-foreground">Companies</Link>
          <span>/</span>
          <Link href={`/companies/${id}`} className="hover:text-foreground">{String(company.name ?? '')}</Link>
          <span>/</span>
          <span className="text-foreground">Nouveau lead</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Nouveau lead</h1>
        </div>
      </div>
      <ContactForm
        action={createContact}
        companies={(allCompanies ?? []) as { id: string; name: string }[]}
        defaultCompanyId={id}
        cancelHref={`/companies/${id}`}
      />
    </div>
  )
}
