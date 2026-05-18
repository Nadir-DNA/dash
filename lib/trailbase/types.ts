// Tables types for Dash — adapted from Supabase Database type

export interface CompanyRow {
  id: string
  name: string
  domain: string | null
  industry: string | null
  size: string | null
  website: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContactRow {
  id: string
  company_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  title: string | null
  stage: ContactStage
  tags: string[]
  source: string | null
  value: number | null
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface CampaignRow {
  id: string
  company_id: string | null
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  subject: string | null
  body: string | null
  scheduled_at: string | null
  sent_count: number
  open_count: number
  click_count: number
  reply_count: number
  created_at: string
  updated_at: string
}

export interface CampaignContactRow {
  id: string
  campaign_id: string
  contact_id: string
  status: EnrollmentStatus
  opened_at: string | null
  clicked_at: string | null
  replied_at: string | null
  enrolled_at: string
}

export interface InteractionRow {
  id: string
  contact_id: string
  company_id: string
  type: string
  subject: string | null
  body: string | null
  direction: string
  created_at: string
}

// Join helpers
export type ContactWithCompany = ContactRow & {
  companies: { id: string; name: string } | null
}

export type ContactRowWithCompanyName = ContactRow & {
  companies: { name: string } | null
}

export type CampaignWithCompany = CampaignRow & {
  companies: { name: string } | null
}

export type EnrolledContact = CampaignContactRow & {
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

// Enums
export type ContactStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'

export type CampaignChannel = 'email' | 'sms' | 'sequence'

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'

export type EnrollmentStatus =
  | 'active'
  | 'completed'
  | 'unsubscribed'
  | 'bounced'
  | 'enrolled'
  | 'sent'
  | 'opened'
  | 'clicked'
  | 'replied'

// Re-export Database type to keep backward compat with existing imports
// that reference @/types/database
export type Database = {
  public: {
    Tables: {
      companies: { Row: CompanyRow }
      contacts: { Row: ContactRow }
      campaigns: { Row: CampaignRow }
      campaign_contacts: { Row: CampaignContactRow }
      interactions: { Row: InteractionRow }
    }
    Enums: {
      contact_stage: ContactStage
      campaign_channel: CampaignChannel
      campaign_status: CampaignStatus
      enrollment_status: EnrollmentStatus
    }
  }
}

// Compat helper — existing code uses Enums<'contact_stage'>
export type Enums<K extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][K]
