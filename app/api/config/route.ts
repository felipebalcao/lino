import { NextRequest, NextResponse } from 'next/server'
import { readConfig, writeConfig } from '@/lib/config-server'
import { isMasterAuth } from '@/lib/master-auth'

export async function GET() {
  const config = await readConfig()
  return NextResponse.json({
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    uazapiUrl: config.uazapiUrl,
    hasOpenaiKey: !!config.openaiKey,
    configured: !!(config.supabaseUrl && config.supabaseAnonKey),
  })
}

export async function POST(request: NextRequest) {
  if (!isMasterAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()

  await writeConfig({
    supabaseUrl: body.supabaseUrl?.trim() || '',
    supabaseAnonKey: body.supabaseAnonKey?.trim() || '',
    uazapiUrl: body.uazapiUrl?.trim() || '',
    uazapiToken: body.uazapiToken?.trim() || '',
    openaiKey: body.openaiKey?.trim() || '',
  })

  return NextResponse.json({ ok: true })
}
