import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readConfig } from '@/lib/config-server'

function aplicarVariaveis(mensagem: string, nome?: string) {
  return mensagem.replace(/\{\{nome\}\}/gi, nome || 'cliente')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const config = await readConfig()
  const supabase = createClient(config.supabaseUrl!, config.supabaseAnonKey!)
  const uazapiBase = config.uazapiUrl?.replace(/\/+$/, '').replace(/\/send\/.*$/, '')
  const uazapiToken = config.uazapiToken

  if (!uazapiBase || !uazapiToken) {
    return NextResponse.json({ error: 'UAZAPI não configurada' }, { status: 500 })
  }

  // Busca campanha
  const { data: campanha } = await supabase
    .from('campanhas_disparo')
    .select('*')
    .eq('id', id)
    .single()

  if (!campanha) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

  // Busca contatos pendentes
  const { data: contatos } = await supabase
    .from('disparo_contatos')
    .select('*')
    .eq('campanha_id', id)
    .eq('status', 'a_enviar')

  if (!contatos?.length) {
    return NextResponse.json({ ok: true, enviados: 0 })
  }

  let enviados = 0
  let erros = 0

  for (const contato of contatos) {
    const texto = aplicarVariaveis(campanha.mensagem, contato.nome)

    try {
      const res = await fetch(`${uazapiBase}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: uazapiToken },
        body: JSON.stringify({ number: contato.telefone, text: texto }),
      })

      if (res.ok) {
        await supabase.from('disparo_contatos').update({ status: 'enviado' }).eq('id', contato.id)
        enviados++
      } else {
        const err = await res.json().catch(() => ({}))
        await supabase.from('disparo_contatos').update({ status: 'erro', erro: JSON.stringify(err) }).eq('id', contato.id)
        erros++
      }
    } catch (e) {
      await supabase.from('disparo_contatos').update({ status: 'erro', erro: String(e) }).eq('id', contato.id)
      erros++
    }

    // Delay entre mensagens para evitar bloqueio
    await sleep(1500)
  }

  // Atualiza campanha
  await supabase
    .from('campanhas_disparo')
    .update({ enviados, erros, status: erros === contatos.length ? 'erro' : 'enviado' })
    .eq('id', id)

  return NextResponse.json({ ok: true, enviados, erros })
}
