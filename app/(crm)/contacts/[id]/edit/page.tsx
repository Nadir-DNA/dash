import { createClient } from '@/lib/trailbase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { updateContact } from '@/app/actions/contacts'
import { ContactForm } from '@/components/contact-form'
import type { Tables } from '@/types/database'

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createClient()

  let contact: Record<string, unknown> | null = null
  let allCompanies: Record<string, unknown>[] = []
  try {
    contact = await client.records('contacts').read(id) as Record<string, unknown>
    const companiesRes = await client.records('companies').list({ order: ['name'] })
    allCompanies = companiesRes.records ?? []
  } catch {
    notFound()
  }

  if (!contact) notFound()

  const action = updateContact.bind(null, id, contact.company_id as string)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/contacts" className="hover:text-foreground">Leads</Link>
          <span>/</span>
          <Link href={`/contacts/${id}`} className="hover:text-foreground">{String(contact.first_name ?? '')} {String(contact.last_name ?? '')}</Link>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Modifier {String(contact.first_name ?? '')} {String(contact.last_name ?? '')}</h1>
        </div>
      </div>
      <ContactForm
        action={action}
        contact={contact as Tables<'contacts'>}
        companies={(allCompanies ?? []) as { id: string; name: string }[]}
        cancelHref={`/contacts/${id}`}
      />
    </div>
  )
}
