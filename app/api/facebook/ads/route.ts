import { NextRequest, NextResponse } from 'next/server'
import { readConfig } from '@/lib/config-server'

const FB_API_VERSION = 'v19.0'

const FIELDS = [
  'campaign_name',
  'spend',
  'impressions',
  'clicks',
  'cpm',
  'actions',
  'cost_per_action_type',
].join(',')

export interface CampanhaMetrica {
  campanha: string
  gasto: number
  impressoes: number
  cliques: number
  cpm: number
  mensagensIniciadas: number
  custoPorMensagem: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')
  const until = searchParams.get('until')
  const datePreset = searchParams.get('date_preset')

  const config = await readConfig()

  if (!config.fbAdsToken || !config.fbAdAccountId) {
    return NextResponse.json({ error: 'Marketing API não configurada' }, { status: 400 })
  }

  const accountId = config.fbAdAccountId.startsWith('act_')
    ? config.fbAdAccountId
    : `act_${config.fbAdAccountId}`

  const params = new URLSearchParams({
    level: 'campaign',
    fields: FIELDS,
    access_token: config.fbAdsToken,
  })

  if (since && until) {
    params.set('time_range', JSON.stringify({ since, until }))
  } else {
    params.set('date_preset', datePreset || 'last_30d')
  }

  const url = `https://graph.facebook.com/${FB_API_VERSION}/${accountId}/insights?${params}`

  const res = await fetch(url)
  const json = await res.json()

  if (!res.ok) {
    console.error('[FB ADS] Erro:', JSON.stringify(json))
    return NextResponse.json({ error: json }, { status: res.status })
  }

  const campanhas: CampanhaMetrica[] = (json.data ?? []).map((row: Record<string, unknown>) => {
    const actions = (row.actions as { action_type: string; value: string }[]) ?? []
    const costPerAction = (row.cost_per_action_type as { action_type: string; value: string }[]) ?? []

    // Mensagens iniciadas — WhatsApp ou Messenger
    const MESSAGING_ACTIONS = [
      'onsite_conversion.messaging_conversation_started_7d',
      'onsite_conversion.total_messaging_connection',
      'whatsapp_contact',
    ]

    const mensagensIniciadas = actions
      .filter((a) => MESSAGING_ACTIONS.includes(a.action_type))
      .reduce((sum, a) => sum + Number(a.value), 0)

    const custoPorMensagem = costPerAction
      .filter((a) => MESSAGING_ACTIONS.includes(a.action_type))
      .reduce((_, a) => Number(a.value), 0)

    return {
      campanha: row.campaign_name as string,
      gasto: Number(row.spend ?? 0),
      impressoes: Number(row.impressions ?? 0),
      cliques: Number(row.clicks ?? 0),
      cpm: Number(row.cpm ?? 0),
      mensagensIniciadas,
      custoPorMensagem,
    }
  })

  // Totais
  const totais = campanhas.reduce(
    (acc, c) => ({
      gasto: acc.gasto + c.gasto,
      impressoes: acc.impressoes + c.impressoes,
      cliques: acc.cliques + c.cliques,
      mensagensIniciadas: acc.mensagensIniciadas + c.mensagensIniciadas,
    }),
    { gasto: 0, impressoes: 0, cliques: 0, mensagensIniciadas: 0 }
  )

  return NextResponse.json({ campanhas, totais })
}
