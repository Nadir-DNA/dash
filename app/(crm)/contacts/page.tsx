import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button, buttonVariants } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { STAGE_VARIANTS, STAGE_LABELS } from '@/lib/constants'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; company?: string; q?: string }>
}) {
  const { stage, company, q } = await searchParams
  const client = await createClient()

  // Build filters
  const filters: { column: string; op: string; value: string }[] = []
  if (stage && stage !== 'all') filters.push({ column: 'stage', op: 'equal', value: stage })
  if (company && company !== 'all') filters.push({ column: 'company_id', op: 'equal', value: company })

  const contactsRes = await client.records('contacts').list({
    filters: filters.length > 0 ? filters : undefined,
    order: ['-created_at'],
  })
  const contacts = contactsRes.records ?? []

  // Fetch companies for the filter dropdown AND for the join in display
  const companiesRes = await client.records('companies').list({ order: ['name'] })
  const companies = companiesRes.records ?? []
  const companiesMap = new Map<string, string>()
  for (const c of companies) {
    companiesMap.set(c.id as string, c.name as string)
  }

  // Attach company name to contacts
  const contactsWithCompany = contacts.map((c: Record<string, unknown>) => ({
    ...c,
    companies: c.company_id ? { name: companiesMap.get(c.company_id as string) ?? null } : null,
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Leads</h1>
          <Badge variant="secondary">{contacts?.length ?? 0}</Badge>
        </div>
        <Link href="/contacts/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="size-4" />
          Nouveau lead
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Rechercher..." className="w-48" />
        <Select name="stage" defaultValue={stage || 'all'}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="company" defaultValue={company || 'all'}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les companies</SelectItem>
            {companies?.map(c => (
              <SelectItem key={c.id as string} value={c.id as string}>{c.name as string}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary" size="sm">Filtrer</Button>
      </form>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Valeur</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(contactsWithCompany as Record<string, unknown>[])?.map((contact) => (
              <TableRow key={contact.id as string}>
                <TableCell>
                  <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                    {contact.first_name as string} {contact.last_name as string}
                  </Link>
                  {contact.title && <p className="text-xs text-muted-foreground">{contact.title as string}</p>}
                </TableCell>
                <TableCell className="text-muted-foreground">{(contact.email as string) ?? '—'}</TableCell>
                <TableCell>
                  {(contact.companies as { name: string } | null) ? (
                    <Link href={`/companies/${contact.company_id}`} className="text-sm hover:underline">
                      {(contact.companies as { name: string }).name}
                    </Link>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={STAGE_VARIANTS[contact.stage as string]}>
                    {STAGE_LABELS[contact.stage as string]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {contact.value ? `${Number(contact.value).toLocaleString('fr-FR')} €` : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{(contact.source as string) ?? '—'}</TableCell>
              </TableRow>
            ))}
            {(!contacts || contacts.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Aucun lead trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
