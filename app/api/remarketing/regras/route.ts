import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('remarketing_regras')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  const body = await request.json()
  const { status_alvo, tempo_horas, mensagem } = body

  if (!status_alvo || !tempo_horas || !mensagem) {
    return NextResponse.json({ error: 'status_alvo, tempo_horas e mensagem são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('remarketing_regras')
    .insert({ status_alvo, tempo_horas: Number(tempo_horas), mensagem, ativo: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
