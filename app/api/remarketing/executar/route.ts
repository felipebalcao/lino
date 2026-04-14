import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readConfig } from '@/lib/config-server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

export async function POST() {
  const supabase = getSupabase()

  // Carrega config UAZAPI
  const config = await readConfig()
  const uazapiBase = config.uazapiUrl?.replace(/\/+$/, '').replace(/\/send\/.*$/, '')
  const uazapiToken = config.uazapiToken

  if (!uazapiBase || !uazapiToken) {
    return NextResponse.json({ error: 'UAZAPI não configurada' }, { status: 500 })
  }

  // Busca regras ativas
  const { data: regras, error: errRegras } = await supabase
    .from('remarketing_regras')
    .select('*')
    .eq('ativo', true)

  if (errRegras) return NextResponse.json({ error: errRegras.message }, { status: 500 })
  if (!regras || regras.length === 0) return NextResponse.json({ ok: true, enviados: 0, detalhes: [] })

  const agora = new Date()
  const resultados: { regra_id: string; status_alvo: string; enviados: number; erros: number }[] = []

  for (const regra of regras) {
    const limiteData = new Date(agora.getTime() - regra.tempo_horas * 60 * 60 * 1000)

    // Clientes no status alvo com dt_ultima_mensagem mais antiga que o limite
    const { data: clientes, error: errClientes } = await supabase
      .from('clientes')
      .select('id, nome, telefone, cidade, dt_ultima_mensagem')
      .eq('status_atual', regra.status_alvo)
      .not('telefone', 'is', null)
      .lt('dt_ultima_mensagem', limiteData.toISOString())

    if (errClientes || !clientes || clientes.length === 0) {
      resultados.push({ regra_id: regra.id, status_alvo: regra.status_alvo, enviados: 0, erros: 0 })
      continue
    }

    // Deduplica por telefone (manter maior id)
    const unicosPorTelefone: Record<string, typeof clientes[0]> = {}
    for (const c of clientes) {
      if (!c.telefone) continue
      if (!unicosPorTelefone[c.telefone] || c.id > unicosPorTelefone[c.telefone].id) {
        unicosPorTelefone[c.telefone] = c
      }
    }
    const clientesUnicos = Object.values(unicosPorTelefone)

    // Busca logs desta regra — telefones já enviados
    const telefones = clientesUnicos.map((c) => c.telefone)
    const { data: logs } = await supabase
      .from('remarketing_logs')
      .select('telefone')
      .eq('regra_id', regra.id)
      .in('telefone', telefones)

    const jaEnviados = new Set((logs ?? []).map((l) => l.telefone))

    let enviados = 0
    let erros = 0

    for (const cliente of clientesUnicos) {
      if (jaEnviados.has(cliente.telefone)) continue

      // Substitui variáveis na mensagem
      const texto = regra.mensagem
        .replace(/\{\{nome_cliente\}\}/gi, cliente.nome || 'Cliente')
        .replace(/\{\{nome\}\}/gi, cliente.nome || 'Cliente')
        .replace(/\{\{cidade\}\}/gi, cliente.cidade || '')

      try {
        const resp = await fetch(`${uazapiBase}/send/text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token: uazapiToken,
          },
          body: JSON.stringify({ number: cliente.telefone, text: texto }),
        })

        if (resp.ok) {
          // Registra no log para evitar reenvio
          await supabase.from('remarketing_logs').insert({
            regra_id: regra.id,
            telefone: cliente.telefone,
          })
          enviados++
        } else {
          erros++
        }
      } catch {
        erros++
      }
    }

    resultados.push({ regra_id: regra.id, status_alvo: regra.status_alvo, enviados, erros })
  }

  const totalEnviados = resultados.reduce((sum, r) => sum + r.enviados, 0)
  return NextResponse.json({ ok: true, enviados: totalEnviados, detalhes: resultados })
}

// Permite chamada pelo cron (GET)
export async function GET() {
  return POST()
}
