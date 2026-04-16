import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readConfig } from '@/lib/config-server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

function dentroDoHorario(horaInicio: string | null, horaFim: string | null): boolean {
  if (!horaInicio || !horaFim) return true
  const agora = new Date()
  const atual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`
  if (horaInicio <= horaFim) return atual >= horaInicio && atual <= horaFim
  return atual >= horaInicio || atual <= horaFim
}

async function executarRegra(id: string) {
  const supabase = getSupabase()

  const config = await readConfig()
  const uazapiBase = config.uazapiUrl?.replace(/\/+$/, '').replace(/\/send\/.*$/, '')
  const uazapiToken = config.uazapiToken

  if (!uazapiBase || !uazapiToken) {
    return NextResponse.json({ error: 'UAZAPI não configurada' }, { status: 500 })
  }

  // Busca a regra específica
  const { data: regra, error: errRegra } = await supabase
    .from('remarketing_regras')
    .select('*')
    .eq('id', id)
    .single()

  if (errRegra || !regra) {
    return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })
  }

  if (!regra.ativo) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: 'regra inativa' })
  }

  if (!dentroDoHorario(regra.hora_inicio ?? null, regra.hora_fim ?? null)) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: 'fora do horário permitido' })
  }

  const agora = new Date()
  const limiteData = new Date(agora.getTime() - regra.tempo_horas * 60 * 60 * 1000)

  // Clientes no status alvo parados há mais tempo que o configurado
  // Ordena por dt_ultima_mensagem ascending (mais antigos primeiro)
  const { data: clientes, error: errClientes } = await supabase
    .from('clientes')
    .select('id, nome, telefone, cidade, dt_ultima_mensagem')
    .eq('status_atual', regra.status_alvo)
    .not('telefone', 'is', null)
    .lt('dt_ultima_mensagem', limiteData.toISOString())
    .order('dt_ultima_mensagem', { ascending: true })

  if (errClientes || !clientes || clientes.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 })
  }

  // Deduplica por telefone (mantém maior id)
  const unicosPorTelefone: Record<string, typeof clientes[0]> = {}
  for (const c of clientes) {
    if (!c.telefone) continue
    if (!unicosPorTelefone[c.telefone] || c.id > unicosPorTelefone[c.telefone].id) {
      unicosPorTelefone[c.telefone] = c
    }
  }

  // Mantém ordem por dt_ultima_mensagem após deduplicação
  let clientesUnicos = Object.values(unicosPorTelefone).sort(
    (a, b) => new Date(a.dt_ultima_mensagem).getTime() - new Date(b.dt_ultima_mensagem).getTime()
  )

  // Contagem de envios por telefone para esta regra
  const telefones = clientesUnicos.map((c) => c.telefone)
  const { data: logs } = await supabase
    .from('remarketing_logs')
    .select('telefone')
    .eq('regra_id', regra.id)
    .in('telefone', telefones)

  const maxRep = regra.max_repeticoes ?? 1
  const contagemEnvios: Record<string, number> = {}
  for (const log of logs ?? []) {
    contagemEnvios[log.telefone] = (contagemEnvios[log.telefone] ?? 0) + 1
  }

  // Filtra clientes que ainda não atingiram o máximo de repetições
  clientesUnicos = clientesUnicos.filter((c) => (contagemEnvios[c.telefone] ?? 0) < maxRep)

  // Aplica limite de envios por execução
  if (regra.limite && regra.limite > 0) {
    clientesUnicos = clientesUnicos.slice(0, regra.limite)
  }

  let enviados = 0
  let erros = 0
  const intervaloMs = (regra.intervalo_segundos ?? 3) * 1000

  for (let i = 0; i < clientesUnicos.length; i++) {
    const cliente = clientesUnicos[i]
    // Seleciona mensagem aleatória se houver múltiplas variações
    let mensagemBase = regra.mensagem
    try {
      const arr = JSON.parse(regra.mensagem)
      if (Array.isArray(arr) && arr.length > 0) {
        mensagemBase = arr[Math.floor(Math.random() * arr.length)]
      }
    } catch { /* string simples, usa como está */ }

    const texto = mensagemBase
      .replace(/\{\{nome_cliente\}\}/gi, cliente.nome || 'Cliente')
      .replace(/\{\{nome\}\}/gi, cliente.nome || 'Cliente')
      .replace(/\{\{cidade\}\}/gi, cliente.cidade || '')

    try {
      const resp = await fetch(`${uazapiBase}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: uazapiToken },
        body: JSON.stringify({ number: cliente.telefone, text: texto }),
      })

      if (resp.ok) {
        await supabase.from('remarketing_logs').insert({ regra_id: regra.id, telefone: cliente.telefone })
        enviados++
      } else {
        erros++
      }
    } catch {
      erros++
    }

    // Aguarda intervalo antes do próximo envio (exceto no último)
    if (i < clientesUnicos.length - 1 && intervaloMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervaloMs))
    }
  }

  return NextResponse.json({ ok: true, enviados, erros })
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return executarRegra(id)
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return executarRegra(id)
}
