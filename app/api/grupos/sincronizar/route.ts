import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv, readConfig } from '@/lib/config-server'

function getSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function POST(request: NextRequest) {
  const { rotator_id } = await request.json()

  if (!rotator_id) {
    return NextResponse.json({ error: 'rotator_id obrigatório' }, { status: 400 })
  }

  const config = await readConfig()
  const uazapiBase = config.uazapiUrl?.replace(/\/+$/, '').replace(/\/send\/.*$/, '')
  const uazapiToken = config.uazapiToken

  if (!uazapiBase || !uazapiToken) {
    return NextResponse.json({ error: 'UAZAPI não configurada' }, { status: 500 })
  }

  const supabase = getSupabase()

  const { data: links, error } = await supabase
    .from('grupos_links')
    .select('id, url')
    .eq('rotator_id', rotator_id)
    .eq('ativo', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resultados: { id: string; participantes: number | null; erro?: string }[] = []

  for (const link of links ?? []) {
    try {
      const resp = await fetch(`${uazapiBase}/group/invite/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': uazapiToken,
        },
        body: JSON.stringify({ invitecode: link.url }),
      })

      if (!resp.ok) {
        resultados.push({ id: link.id, participantes: null, erro: `HTTP ${resp.status}` })
        continue
      }

      const data = await resp.json()
      const participantes: number = Array.isArray(data.Participants) ? data.Participants.length : 0

      await supabase
        .from('grupos_links')
        .update({ participantes })
        .eq('id', link.id)

      resultados.push({ id: link.id, participantes })
    } catch (e: unknown) {
      resultados.push({ id: link.id, participantes: null, erro: e instanceof Error ? e.message : 'Erro' })
    }
  }

  return NextResponse.json({ ok: true, resultados })
}
