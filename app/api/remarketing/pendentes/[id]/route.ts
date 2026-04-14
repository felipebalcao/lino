import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params

  // Busca a regra
  const { data: regra, error: errRegra } = await supabase
    .from('remarketing_regras')
    .select('status_alvo, tempo_horas')
    .eq('id', id)
    .single()

  if (errRegra || !regra) return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 })

  const limiteData = new Date(Date.now() - regra.tempo_horas * 60 * 60 * 1000)

  // Clientes elegíveis
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, telefone')
    .eq('status_atual', regra.status_alvo)
    .not('telefone', 'is', null)
    .lt('dt_ultima_mensagem', limiteData.toISOString())

  if (!clientes || clientes.length === 0) return NextResponse.json({ pendentes: 0 })

  // Deduplica por telefone
  const unicosPorTelefone: Record<string, number> = {}
  for (const c of clientes) {
    if (!c.telefone) continue
    if (!unicosPorTelefone[c.telefone] || c.id > unicosPorTelefone[c.telefone]) {
      unicosPorTelefone[c.telefone] = c.id
    }
  }
  const telefones = Object.keys(unicosPorTelefone)

  // Exclui os que já receberam
  const { data: logs } = await supabase
    .from('remarketing_logs')
    .select('telefone')
    .eq('regra_id', id)
    .in('telefone', telefones)

  const jaEnviados = new Set((logs ?? []).map((l) => l.telefone))
  const pendentes = telefones.filter((t) => !jaEnviados.has(t)).length

  return NextResponse.json({ pendentes })
}
