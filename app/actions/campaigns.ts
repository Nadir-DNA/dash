'use server'

import { createClient } from '@/lib/trailbase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateUUID, validateRequired, validateOptional, validateChannel, validateStatus, validateArraySize, ValidationError } from '@/lib/validation'
import type { Enums } from '@/lib/trailbase/types'

async function getAuthClient() {
  const client = await createClient()
  const user = client.user() ?? null
  return { client, user }
}

export async function createCampaign(prevState: { error?: string } | null | void, formData: FormData) {
  try {
    const { client, user } = await getAuthClient()
    if (!user) return { error: 'Non autorisé' }

    const name = validateRequired(formData, 'name', 'Le nom')
    const channel = validateChannel(formData.get('channel'))

    const id = await client.records('campaigns').create({
      name,
      channel,
      status: 'draft',
      company_id: validateOptional(formData, 'company_id'),
      subject: validateOptional(formData, 'subject'),
      body: validateOptional(formData, 'body'),
      scheduled_at: validateOptional(formData, 'scheduled_at'),
    })

    revalidatePath('/campaigns')
    redirect(`/campaigns/${id}`)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
}

export async function updateCampaign(id: string, prevState: { error?: string } | null | void, formData: FormData) {
  try {
    const { client, user } = await getAuthClient()
    if (!user) return { error: 'Non autorisé' }

    validateUUID(id, 'Campaign ID')
    const name = validateRequired(formData, 'name', 'Le nom')
    const channel = validateChannel(formData.get('channel'))

    await client.records('campaigns').update(id, {
      name,
      channel,
      company_id: validateOptional(formData, 'company_id'),
      subject: validateOptional(formData, 'subject'),
      body: validateOptional(formData, 'body'),
      scheduled_at: validateOptional(formData, 'scheduled_at'),
    })

    revalidatePath(`/campaigns/${id}`)
    revalidatePath('/campaigns')
    redirect(`/campaigns/${id}`)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
}

export async function updateCampaignStatus(id: string, status: Enums<'campaign_status'>): Promise<{ error?: string }> {
  try {
    validateUUID(id, 'Campaign ID')
    validateStatus(status)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    return { error: 'Paramètres invalides' }
  }

  const { client, user } = await getAuthClient()
  if (!user) return { error: 'Non autorisé' }

  try {
    await client.records('campaigns').update(id, { status })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur' }
  }

  revalidatePath(`/campaigns/${id}`)
  revalidatePath('/campaigns')
  return {}
}

export async function deleteCampaign(id: string): Promise<{ error?: string }> {
  try {
    validateUUID(id, 'Campaign ID')
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    return { error: 'ID invalide' }
  }

  const { client, user } = await getAuthClient()
  if (!user) return { error: 'Non autorisé' }

  try {
    await client.records('campaigns').delete(id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur' }
  }

  revalidatePath('/campaigns')
  redirect('/campaigns')
}

export async function enrollContacts(campaignId: string, contactIds: string[]): Promise<{ error?: string; success?: boolean }> {
  try {
    validateUUID(campaignId, 'Campaign ID')
    validateArraySize(contactIds, 500, 'contacts')
    contactIds.forEach((id, i) => validateUUID(id, `Contact ID[${i}]`))
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    return { error: 'Paramètres invalides' }
  }

  const { client, user } = await getAuthClient()
  if (!user) return { error: 'Non autorisé' }

  try {
    // Insert each enrollment
    for (const contactId of contactIds) {
      await client.records('campaign_contacts').create({
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'enrolled' as Enums<'enrollment_status'>,
      })
    }

    // Get count
    const countRes = await client.records('campaign_contacts').list({
      filters: [{ column: 'campaign_id', op: 'equal', value: campaignId }],
      count: true,
    })
    const count = countRes.total_count ?? 0

    // Update sent_count
    await client.records('campaigns').update(campaignId, { sent_count: count })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur' }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { success: true }
}

export async function unenrollContact(campaignId: string, contactId: string): Promise<{ error?: string }> {
  try {
    validateUUID(campaignId, 'Campaign ID')
    validateUUID(contactId, 'Contact ID')
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    return { error: 'Paramètres invalides' }
  }

  const { client, user } = await getAuthClient()
  if (!user) return { error: 'Non autorisé' }

  try {
    // Find the campaign_contact record
    const res = await client.records('campaign_contacts').list({
      filters: [
        { column: 'campaign_id', op: 'equal', value: campaignId },
        { column: 'contact_id', op: 'equal', value: contactId },
      ],
    })

    if (res.records && res.records.length > 0) {
      await client.records('campaign_contacts').delete(res.records[0].id as string)
    }

    // Get updated count
    const countRes = await client.records('campaign_contacts').list({
      filters: [{ column: 'campaign_id', op: 'equal', value: campaignId }],
      count: true,
    })
    const count = countRes.total_count ?? 0

    await client.records('campaigns').update(campaignId, { sent_count: count })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur' }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return {}
}
