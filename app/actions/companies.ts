'use server'

import { createClient } from '@/lib/trailbase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateUUID, validateRequired, validateOptional, ValidationError } from '@/lib/validation'

async function getAuthClient() {
  const client = await createClient()
  const user = client.user() ?? null
  return { client, user }
}

export async function createCompany(prevState: { error?: string } | null | void, formData: FormData) {
  try {
    const { client, user } = await getAuthClient()
    if (!user) return { error: 'Non autorisé' }

    const name = validateRequired(formData, 'name', 'Le nom')

    const id = await client.records('companies').create({
      name,
      domain: validateOptional(formData, 'domain'),
      industry: validateOptional(formData, 'industry'),
      size: validateOptional(formData, 'size'),
      website: validateOptional(formData, 'website'),
      notes: validateOptional(formData, 'notes'),
    })

    revalidatePath('/companies')
    redirect(`/companies/${id}`)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
}

export async function updateCompany(id: string, prevState: { error?: string } | null | void, formData: FormData) {
  try {
    const { client, user } = await getAuthClient()
    if (!user) return { error: 'Non autorisé' }

    validateUUID(id, 'Company ID')
    const name = validateRequired(formData, 'name', 'Le nom')

    await client.records('companies').update(id, {
      name,
      domain: validateOptional(formData, 'domain'),
      industry: validateOptional(formData, 'industry'),
      size: validateOptional(formData, 'size'),
      website: validateOptional(formData, 'website'),
      notes: validateOptional(formData, 'notes'),
    })

    revalidatePath(`/companies/${id}`)
    revalidatePath('/companies')
    redirect(`/companies/${id}`)
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    throw err
  }
}

export async function deleteCompany(id: string): Promise<{ error?: string }> {
  try {
    validateUUID(id, 'Company ID')
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message }
    return { error: 'ID invalide' }
  }

  const { client, user } = await getAuthClient()
  if (!user) return { error: 'Non autorisé' }

  try {
    await client.records('companies').delete(id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur' }
  }

  revalidatePath('/companies')
  redirect('/companies')
}
