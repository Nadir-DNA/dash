'use server'

import { createClient } from '@/lib/trailbase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateUUID, validateRequired, validateOptional, validateStage, ValidationError } from '@/lib/validation'
import type { Enums } from '@/lib/trailbase/types'

async function getAuthClient() {
  const client = await createClient()
  const user = client.user() ?? null
  return { client, user }
}

export async function createContact(prevState: { error?: string } | null | void, formData: FormData) {
  try {
    const { client, user } = await getAuthClient()
    if (!user) return { error: 'Non autorisé' }

    const firstName = validateRequired(formData, 'first_name', 'Le prénom')
    const lastName = validateRequired(formData, 'last_name', 'Le nom')
    const companyId = validateRequired(formData, 'company_id', 'La company')
    validateUUID(companyId, 'Company ID')

    const valueRaw = formData.get('value') as string
    const value = valueRaw ? parseFloat(valueRaw) : null

    const id = await client.records('contacts').create({
      first_name: firstName,
      last_name: lastName,
      company_id: companyId,
      email: validateOptional(formData, 'email'),
      phone: validateOptional(formData, 'phone'),
      title: validateOptional(formData, 'title'),
      stage: validateStage(formData.get('stage')),
      source: validateOptional(formData, 'source'),
      value: value == null || isNaN(value) ? null : value,
      notes: validateOptional(formData, 'notes'),
    })

    revalidatePath(`/companies/${companyId}`)
    revalidatePath('/contacts')
    redirect(`/contacts/${id}`)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
}

export async function updateContact(id: string, companyId: string, prevState: { error?: string } | null | void, formData: FormData) {
  try {
    const { client, user } = await getAuthClient()
    if (!user) return { error: 'Non autorisé' }

    validateUUID(id, 'Contact ID')
    validateUUID(companyId, 'Company ID')

    const firstName = validateRequired(formData, 'first_name', 'Le prénom')
    const lastName = validateRequired(formData, 'last_name', 'Le nom')
    const valueRaw = formData.get('value') as string
    const value = valueRaw ? parseFloat(valueRaw) : null

    await client.records('contacts').update(id, {
      first_name: firstName,
      last_name: lastName,
      email: validateOptional(formData, 'email'),
      phone: validateOptional(formData, 'phone'),
      title: validateOptional(formData, 'title'),
      stage: validateStage(formData.get('stage')),
      source: validateOptional(formData, 'source'),
      value: value == null || isNaN(value) ? null : value,
      notes: validateOptional(formData, 'notes'),
    })

    revalidatePath(`/contacts/${id}`)
    revalidatePath(`/companies/${companyId}`)
    revalidatePath('/contacts')
    redirect(`/contacts/${id}`)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
}

export async function updateContactStage(id: string, companyId: string, stage: Enums<'contact_stage'>): Promise<{ error?: string }> {
  try {
    validateUUID(id, 'Contact ID')
    validateUUID(companyId, 'Company ID')
    validateStage(stage)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    return { error: 'Paramètres invalides' }
  }

  const { client, user } = await getAuthClient()
  if (!user) return { error: 'Non autorisé' }

  try {
    await client.records('contacts').update(id, {
      stage,
      last_contacted_at: new Date().toISOString(),
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur' }
  }

  revalidatePath(`/contacts/${id}`)
  revalidatePath(`/companies/${companyId}`)
  revalidatePath('/contacts')
  return {}
}

export async function deleteContact(id: string, companyId: string): Promise<{ error?: string }> {
  try {
    validateUUID(id, 'Contact ID')
    validateUUID(companyId, 'Company ID')
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    return { error: 'ID invalide' }
  }

  const { client, user } = await getAuthClient()
  if (!user) return { error: 'Non autorisé' }

  try {
    await client.records('contacts').delete(id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur' }
  }

  revalidatePath(`/companies/${companyId}`)
  revalidatePath('/contacts')
  redirect(`/companies/${companyId}`)
}
