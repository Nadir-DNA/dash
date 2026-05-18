import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { createContact } from '@/app/actions/contacts'
import { ContactForm } from '@/components/contact-form'

export default async function NewContactPage() {
  const client = await createClient()
  const companiesRes = await client.records('companies').list({ order: ['name'] })
  const companies = companiesRes.records ?? []

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/contacts" className="hover:text-foreground">Leads</Link>
          <span>/</span>
          <span className="text-foreground">Nouveau</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Nouveau lead</h1>
        </div>
      </div>
      <ContactForm
        action={createContact}
        companies={companies ?? []}
        cancelHref="/contacts"
      />
    </div>
  )
}
