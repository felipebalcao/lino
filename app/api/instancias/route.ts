import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readConfig } from '@/lib/config-server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('instancias_whatsapp')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  const { nome, token } = await request.json()

  if (!nome?.trim() || !token?.trim()) {
    return NextResponse.json({ error: 'Nome e token são obrigatórios' }, { status: 400 })
  }

  // Verifica limite de instâncias
  const config = await readConfig()
  const limite = parseInt(config.instanciasPermitidas ?? '1', 10) || 1

  const { count } = await supabase
    .from('instancias_whatsapp')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) >= limite) {
    return NextResponse.json(
      { error: `Limite de ${limite} instância${limite !== 1 ? 's' : ''} atingido para este plano.` },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('instancias_whatsapp')
    .insert({ nome: nome.trim(), token: token.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
