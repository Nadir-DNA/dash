import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

export type ContactWithCompany = Tables['contacts']['Row'] & {
  companies: { id: string; name: string } | null
}

export type ContactRow = Tables['contacts']['Row'] & {
  companies: { name: string } | null
}

export type CampaignWithCompany = Tables['campaigns']['Row'] & {
  companies: { name: string } | null
}

export type EnrolledContact = Tables['campaign_contacts']['Row'] & {
  contacts: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    company_id: string
    companies: { name: string } | null
  } | null
}

export type ContactForEnroll = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  companies: { name: string } | null
}
