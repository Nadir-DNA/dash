import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { createCompany } from '@/app/actions/companies'
import { CompanyForm } from '@/components/company-form'

export default function NewCompanyPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/companies" className="hover:text-foreground transition-colors">Companies</Link>
          <span>/</span>
          <span className="text-foreground">Nouvelle</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Nouvelle company</h1>
        </div>
      </div>
      <CompanyForm action={createCompany} cancelHref="/companies" />
    </div>
  )
}
