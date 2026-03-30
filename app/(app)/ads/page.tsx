'use client'

import { useEffect, useState } from 'react'
import { Loader2, TrendingUp, DollarSign, Eye, MousePointer, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react'

interface CampanhaMetrica {
  campanha: string
  gasto: number
  impressoes: number
  cliques: number
  cpm: number
  mensagensIniciadas: number
  custoPorMensagem: number
}

interface Totais {
  gasto: number
  impressoes: number
  cliques: number
  mensagensIniciadas: number
}

type SortField = keyof Omit<CampanhaMetrica, 'campanha'>
type SortDir = 'asc' | 'desc'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatNum(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatPct(value: number) {
  return value.toFixed(2).replace('.', ',') + '%'
}

const PERIODOS = [
  { label: 'Últimos 7 dias', value: 'last_7d' },
  { label: 'Últimos 30 dias', value: 'last_30d' },
  { label: 'Este mês', value: 'this_month' },
  { label: 'Mês passado', value: 'last_month' },
]

const COLUNAS: { field: SortField | null; label: string; align: 'left' | 'right' }[] = [
  { field: null, label: 'Campanha', align: 'left' },
  { field: 'gasto', label: 'Gasto', align: 'right' },
  { field: 'impressoes', label: 'Impressões', align: 'right' },
  { field: 'cliques', label: 'Cliques', align: 'right' },
  { field: 'cpm', label: 'CPM', align: 'right' },
  { field: 'mensagensIniciadas', label: 'Msgs iniciadas', align: 'right' },
  { field: 'custoPorMensagem', label: 'Custo/msg', align: 'right' },
]

export default function AdsPage() {
  const [campanhas, setCampanhas] = useState<CampanhaMetrica[]>([])
  const [totais, setTotais] = useState<Totais | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState('last_30d')
  const [sortField, setSortField] = useState<SortField>('gasto')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  async function carregar(p: string) {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch(`/api/facebook/ads?date_preset=${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data.error))
      setCampanhas(data.campanhas)
      setTotais(data.totais)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar(periodo) }, [periodo])

  function handleSort(field: SortField | null) {
    if (!field) return
    if (sortField === field) {
      setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const campanhasOrdenadas = [...campanhas].sort((a, b) => {
    const mult = sortDir === 'desc' ? -1 : 1
    return (a[sortField] - b[sortField]) * mult
  })

  // Médias calculadas no frontend
  const custoPorConversa = totais && totais.mensagensIniciadas > 0
    ? totais.gasto / totais.mensagensIniciadas : 0
  const cpmMedio = totais && totais.impressoes > 0
    ? (totais.gasto / totais.impressoes) * 1000 : 0
  const ctrMedio = totais && totais.impressoes > 0
    ? (totais.cliques / totais.impressoes) * 100 : 0
  const cpcMedio = totais && totais.cliques > 0
    ? totais.gasto / totais.cliques : 0

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="shrink-0 px-8 py-6 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={22} /> Ads
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Performance das campanhas do Facebook</p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          {PERIODOS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="px-8 py-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            Erro ao carregar: {erro}
          </div>
        )}

        {!loading && !erro && totais && (
          <>
            {/* Linha 1 — Totais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
                  <DollarSign size={14} /> GASTO TOTAL
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatBRL(totais.gasto)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
                  <Eye size={14} /> IMPRESSÕES
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNum(totais.impressoes)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
                  <MousePointer size={14} /> CLIQUES
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNum(totais.cliques)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
                  <MessageSquare size={14} /> MSGS INICIADAS
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNum(totais.mensagensIniciadas)}</p>
              </div>
            </div>

            {/* Linha 2 — Médias */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="text-gray-500 text-xs font-medium mb-2">CUSTO/CONVERSA</div>
                <p className="text-2xl font-bold text-gray-900">{custoPorConversa > 0 ? formatBRL(custoPorConversa) : '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="text-gray-500 text-xs font-medium mb-2">CPM MÉDIO</div>
                <p className="text-2xl font-bold text-gray-900">{formatBRL(cpmMedio)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="text-gray-500 text-xs font-medium mb-2">CTR MÉDIO</div>
                <p className="text-2xl font-bold text-gray-900">{formatPct(ctrMedio)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="text-gray-500 text-xs font-medium mb-2">CPC MÉDIO</div>
                <p className="text-2xl font-bold text-gray-900">{cpcMedio > 0 ? formatBRL(cpcMedio) : '—'}</p>
              </div>
            </div>

            {/* Tabela de campanhas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Campanhas</h2>
              </div>
              {campanhas.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  Nenhuma campanha encontrada no período
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {COLUNAS.map(({ field, label, align }) => (
                          <th
                            key={label}
                            onClick={() => handleSort(field)}
                            className={`py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none ${
                              align === 'left' ? 'text-left px-6' : 'text-right px-4'
                            } ${field ? 'cursor-pointer hover:text-gray-800' : ''}`}
                          >
                            <span className="inline-flex items-center gap-1 justify-end">
                              {label}
                              {field && sortField === field && (
                                sortDir === 'desc'
                                  ? <ChevronDown size={12} />
                                  : <ChevronUp size={12} />
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {campanhasOrdenadas.map((c) => (
                        <tr key={c.campanha} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">{c.campanha}</td>
                          <td className="px-4 py-4 text-right text-gray-700">{formatBRL(c.gasto)}</td>
                          <td className="px-4 py-4 text-right text-gray-500">{formatNum(c.impressoes)}</td>
                          <td className="px-4 py-4 text-right text-gray-500">{formatNum(c.cliques)}</td>
                          <td className="px-4 py-4 text-right text-gray-500">{formatBRL(c.cpm)}</td>
                          <td className="px-4 py-4 text-right text-gray-700 font-medium">{formatNum(c.mensagensIniciadas)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900">
                            {c.custoPorMensagem > 0 ? formatBRL(c.custoPorMensagem) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
