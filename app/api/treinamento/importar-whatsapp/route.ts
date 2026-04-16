import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/config-server'

function getSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  return createClient(supabaseUrl, supabaseAnonKey)
}

// GET — extrai pares pergunta/resposta de mensagens_whatsapp
export async function GET() {
  const supabase = getSupabase()

  const { data: mensagens, error } = await supabase
    .from('mensagens_whatsapp')
    .select('id, numero_cliente, mensagem, quem_mandou, data_criacao')
    .order('numero_cliente', { ascending: true })
    .order('data_criacao', { ascending: true })
    .limit(2000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!mensagens || mensagens.length === 0) return NextResponse.json([])

  // Agrupa por numero_cliente
  const porCliente: Record<string, typeof mensagens> = {}
  for (const m of mensagens) {
    if (!porCliente[m.numero_cliente]) porCliente[m.numero_cliente] = []
    porCliente[m.numero_cliente].push(m)
  }

  const pares: { pergunta: string; resposta: string }[] = []

  for (const conversa of Object.values(porCliente)) {
    for (let i = 0; i < conversa.length - 1; i++) {
      const atual = conversa[i]
      const proxima = conversa[i + 1]

      // Par válido: remetentes diferentes (independente do valor exato de quem_mandou)
      const remetentesDiferentes = atual.quem_mandou !== proxima.quem_mandou

      if (remetentesDiferentes) {
        // A pergunta é sempre a mensagem do cliente (não-agente)
        const agentValues = ['agente', 'Agente', 'bot', 'sistema', 'eu']
        const atualEhAgente = agentValues.includes(atual.quem_mandou)

        const pergunta = (atualEhAgente ? proxima.mensagem : atual.mensagem)?.trim()
        const resposta = (atualEhAgente ? atual.mensagem : proxima.mensagem)?.trim()

        // Filtra mensagens muito curtas ou automáticas
        if (
          pergunta && resposta &&
          pergunta.length > 5 && resposta.length > 5 &&
          !pergunta.startsWith('http') && !resposta.startsWith('http')
        ) {
          pares.push({ pergunta, resposta })
        }
      }
    }
  }

  // Remove duplicatas por pergunta similar (exact match)
  const vistos = new Set<string>()
  const paresFiltrados = pares.filter((p) => {
    const chave = p.pergunta.toLowerCase().slice(0, 60)
    if (vistos.has(chave)) return false
    vistos.add(chave)
    return true
  })

  return NextResponse.json(paresFiltrados.slice(0, 100))
}

// POST — importa pares selecionados para treinamento_qa
export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  const { pares } = await request.json() as { pares: { pergunta: string; resposta: string }[] }

  if (!pares || pares.length === 0) {
    return NextResponse.json({ error: 'Nenhum par selecionado' }, { status: 400 })
  }

  const { error } = await supabase
    .from('treinamento_qa')
    .insert(pares.map((p) => ({ pergunta: p.pergunta.trim(), resposta: p.resposta.trim() })))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, importados: pares.length })
}
