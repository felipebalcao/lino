import { NextRequest, NextResponse } from 'next/server'
import { readConfig } from '@/lib/config-server'

export async function POST(request: NextRequest) {
  const config = await readConfig()
  const uazapiBase = config.uazapiUrl?.replace(/\/+$/, '').replace(/\/send\/.*$/, '')
  const uazapiToken = config.uazapiToken

  if (!uazapiBase || !uazapiToken) {
    return NextResponse.json({ error: 'UAZAPI não configurada' }, { status: 500 })
  }

  const { numero, mensagem } = await request.json()

  if (!numero || !mensagem) {
    return NextResponse.json({ error: 'numero e mensagem são obrigatórios' }, { status: 400 })
  }

  // Sempre texto por enquanto — endpoint fixo
  const url = `${uazapiBase}/send/text`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': uazapiToken,
    },
    body: JSON.stringify({ number: numero, text: mensagem }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json({ error: 'Falha ao enviar mensagem', detail: data }, { status: response.status })
  }

  return NextResponse.json({ ok: true, data })
}
