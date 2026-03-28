import { NextRequest, NextResponse } from 'next/server'
import { readConfig } from '@/lib/config-server'

export async function POST(request: NextRequest) {
  const config = await readConfig()
  const uazapiUrl = config.uazapiUrl
  const uazapiToken = config.uazapiToken

  if (!uazapiUrl || !uazapiToken) {
    return NextResponse.json({ error: 'UAZAPI não configurada' }, { status: 500 })
  }

  const { numero, mensagem } = await request.json()

  if (!numero || !mensagem) {
    return NextResponse.json({ error: 'numero e mensagem são obrigatórios' }, { status: 400 })
  }

  const response = await fetch(uazapiUrl, {
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
