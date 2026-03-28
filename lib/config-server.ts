import { createClient } from '@supabase/supabase-js'

export interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  uazapiUrl: string
  uazapiToken: string
  openaiKey: string
}

function getSupabaseForConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

export function getSupabaseEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }
}

export async function readConfig(): Promise<AppConfig> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()

  let uazapiUrl = process.env.UAZAPI_URL || ''
  let uazapiToken = process.env.UAZAPI_TOKEN || ''
  let openaiKey = process.env.OPENAI_API_KEY || ''

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = getSupabaseForConfig()
      const { data } = await supabase.from('configuracoes').select('chave, valor')
      if (data) {
        for (const row of data) {
          if (row.chave === 'uazapi_url' && row.valor) uazapiUrl = row.valor
          if (row.chave === 'uazapi_token' && row.valor) uazapiToken = row.valor
          if (row.chave === 'openai_key' && row.valor) openaiKey = row.valor
        }
      }
    } catch { /* ignora */ }
  }

  return { supabaseUrl, supabaseAnonKey, uazapiUrl, uazapiToken, openaiKey }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  const supabase = getSupabaseForConfig()

  const entries = [
    { chave: 'uazapi_url', valor: config.uazapiUrl },
    { chave: 'uazapi_token', valor: config.uazapiToken },
    { chave: 'openai_key', valor: config.openaiKey },
  ]

  for (const entry of entries) {
    await supabase.from('configuracoes').upsert(entry, { onConflict: 'chave' })
  }
}

export function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return !!(url && key)
}
