import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  uazapiUrl: string
  uazapiToken: string
  openaiKey: string
}

const CONFIG_PATH = join(process.cwd(), 'data', 'config.json')


export function readConfig(): AppConfig {
  // Prioridade: config.json > .env
  if (existsSync(CONFIG_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as AppConfig
      if (parsed.supabaseUrl) return parsed
    } catch { /* ignora */ }
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    uazapiUrl: process.env.UAZAPI_URL || '',
    uazapiToken: process.env.UAZAPI_TOKEN || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
  }
}

export function writeConfig(config: AppConfig): void {
  const dir = join(process.cwd(), 'data')
  if (!existsSync(dir)) mkdirSync(dir)
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export function isConfigured(): boolean {
  const c = readConfig()
  return !!(c.supabaseUrl && c.supabaseAnonKey)
}
