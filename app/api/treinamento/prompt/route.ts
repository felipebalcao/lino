import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readConfig } from '@/lib/config-server'

function getSupabase() {
  const { supabaseUrl, supabaseAnonKey } = readConfig()
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('treinamento_prompt')
    .select('*')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conteudo: data?.conteudo ?? '' })
}

export async function POST(request: NextRequest) {
  const { conteudo } = await request.json()
  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('treinamento_prompt')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('treinamento_prompt')
      .update({ conteudo, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('treinamento_prompt')
      .insert({ conteudo })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
