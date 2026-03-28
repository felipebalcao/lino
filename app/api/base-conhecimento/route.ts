import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readConfig } from '@/lib/config-server'

// Endpoint público para o n8n buscar a base de conhecimento mais recente
export async function GET() {
  const { supabaseUrl, supabaseAnonKey } = readConfig()
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase
    .from('base_conhecimento')
    .select('*')
    .order('gerado_em', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Nenhuma base de conhecimento encontrada.' }, { status: 404 })
  }

  return NextResponse.json(data)
}
