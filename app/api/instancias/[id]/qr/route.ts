import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readConfig } from '@/lib/config-server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key)
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params

  const { data: instancia, error } = await supabase
    .from('instancias_whatsapp')
    .select('token')
    .eq('id', id)
    .single()

  if (error || !instancia) {
    return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
  }

  const config = await readConfig()
  const base = config.uazapiUrl?.replace(/\/+$/, '').replace(/\/send\/.*$/, '')

  if (!base) {
    return NextResponse.json({ error: 'URL da UAZAPI não configurada' }, { status: 500 })
  }

  try {
    const res = await fetch(`${base}/instance/qr`, {
      headers: { token: instancia.token },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar QR code' }, { status: 500 })
  }
}
