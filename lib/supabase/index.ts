import { createClient } from './server'

export async function getCompanies() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('name')
  
  if (error) {
    console.error('Error fetching companies:', error)
    return []
  }
  
  return data || []
}