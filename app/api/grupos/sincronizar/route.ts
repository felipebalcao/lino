import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv, readConfig } from '@/lib/config-server'

function getSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  return createClient(supabaseUrl, supabaseAnonKey)
}

function getUazapiBase(uazapiUrl: string): string {
  // Remove trailing slash e qualquer path após o host+porta (ex: /send/text, /group/info, etc)
  // Suporta tanto "https://host/send/text" quanto "https://host"
  try {
    const u = new URL(uazapiUrl)
    return `${u.protocol}//${u.host}`
  } catch {
    return uazapiUrl.replace(/\/+$/, '').replace(/\/(send|group|message|chat|instance).*$/, '')
  }
}

export async function POST(request: NextRequest) {
  const { rotator_id } = await request.json()

  if (!rotator_id) {
    return NextResponse.json({ error: 'rotator_id obrigatório' }, { status: 400 })
  }

  const config = await readConfig()
  const uazapiBase = config.uazapiUrl ? getUazapiBase(config.uazapiUrl) : ''
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

  if (!links || links.length === 0) {
    return NextResponse.json({ ok: true, resultados: [], aviso: 'Nenhum link ativo encontrado' })
  }

  const resultados: { id: string; participantes: number | null; erro?: string; detalhe?: string }[] = []

  for (const link of links) {
    try {
      const endpoint = `${uazapiBase}/group/invite/info`
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': uazapiToken,
        },
        body: JSON.stringify({ invitecode: link.url }),
      })

      const text = await resp.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) } catch { /* não era JSON */ }

      if (!resp.ok) {
        resultados.push({ id: link.id, participantes: null, erro: `HTTP ${resp.status}`, detalhe: text.slice(0, 200) })
        continue
      }

      const participantes: number = Array.isArray(data.Participants) ? (data.Participants as unknown[]).length : 0

      await supabase
        .from('grupos_links')
        .update({ participantes })
        .eq('id', link.id)

      resultados.push({ id: link.id, participantes })
    } catch (e: unknown) {
      resultados.push({ id: link.id, participantes: null, erro: e instanceof Error ? e.message : 'Erro desconhecido' })
    }
  }

  return NextResponse.json({ ok: true, uazapiBase, resultados })
}
