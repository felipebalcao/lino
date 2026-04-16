'use client'

import { useEffect, useState, useCallback } from 'react'
import { getClientesPorDia, getAtendimentoVsResposta, getContagemPorStatusAtual } from '@/services/clientesService'
import { getContagemPorSecao } from '@/services/kanbanService'
import { Users, TrendingUp, AlertCircle, Loader2, Calendar } from 'lucide-react'

interface DadosDia {
  data: string
  total: number
}

interface DadosAtendimento {
  data: string
  semResposta: number
  comResposta: number
}

function formatarData(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function hoje() { return new Date().toISOString().slice(0, 10) }
function haNDias(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
function addDias(iso: string, n: number) {
  const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}

function useMaxDias() {
  const [maxDias, setMaxDias] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 15 : 20
  )
  useEffect(() => {
    function atualizar() { setMaxDias(window.innerWidth < 768 ? 15 : 20) }
    window.addEventListener('resize', atualizar)
    return () => window.removeEventListener('resize', atualizar)
  }, [])
  return maxDias
}

export default function DashboardPage() {
  const MAX_DIAS = useMaxDias()
  const [totalClientes, setTotalClientes] = useState<number | null>(null)
  const [clientesPorDia, setClientesPorDia] = useState<DadosDia[]>([])
  const [atendimento, setAtendimento] = useState<DadosAtendimento[]>([])
  const [kanban, setKanban] = useState<{ nome: string; total: number }[]>([])
  const [statusAtual, setStatusAtual] = useState<{ status: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(haNDias(typeof window !== 'undefined' && window.innerWidth < 768 ? 15 : 20))
  const [endDate, setEndDate] = useState(hoje())

  function handleStartChange(val: string) {
    setStartDate(val)
    const maxEnd = addDias(val, MAX_DIAS)
    if (endDate > maxEnd) setEndDate(maxEnd > hoje() ? hoje() : maxEnd)
  }

  function handleEndChange(val: string) {
    setEndDate(val)
    const minStart = addDias(val, -MAX_DIAS)
    if (startDate < minStart) setStartDate(minStart)
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const [porDia, atend, kanbanData, statusData] = await Promise.all([
        getClientesPorDia(startDate, endDate),
        getAtendimentoVsResposta(startDate, endDate),
        getContagemPorSecao(),
        getContagemPorStatusAtual(),
      ])
      setClientesPorDia(porDia)
      setTotalClientes(porDia.reduce((s, d) => s + d.total, 0))
      setAtendimento(atend)
      setKanban(kanbanData)
      setStatusAtual(statusData)
    } catch {
      setErro('Erro ao carregar dados. Verifique sua conexão com o Supabase.')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { carregar() }, [carregar])

  const maxDia = Math.max(...clientesPorDia.map((d) => d.total), 1)
  const maxAtend = Math.max(...atendimento.map((d) => d.comResposta + d.semResposta), 1)
  const BAR_HEIGHT = 160

  const CORES = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316']

  function pizzaSlices(dados: { nome: string; total: number }[]) {
    const total = dados.reduce((s, d) => s + d.total, 0)
    let angulo = -Math.PI / 2
    return dados.map((d, i) => {
      const fatia = (d.total / total) * 2 * Math.PI
      const x1 = 80 + 70 * Math.cos(angulo)
      const y1 = 80 + 70 * Math.sin(angulo)
      angulo += fatia
      const x2 = 80 + 70 * Math.cos(angulo)
      const y2 = 80 + 70 * Math.sin(angulo)
      const grande = fatia > Math.PI ? 1 : 0
      const path = `M80,80 L${x1},${y1} A70,70 0 ${grande},1 ${x2},${y2} Z`
      return { path, cor: CORES[i % CORES.length], ...d, pct: Math.round((d.total / total) * 100) }
    })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do sistema</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <Calendar size={15} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => handleStartChange(e.target.value)}
            className="text-sm text-gray-700 focus:outline-none bg-transparent"
          />
          <span className="text-gray-300 text-sm">→</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={hoje()}
            onChange={(e) => handleEndChange(e.target.value)}
            className="text-sm text-gray-700 focus:outline-none bg-transparent"
          />
          <span className="text-[10px] text-gray-300 ml-1">máx. {MAX_DIAS} dias</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          <span>Carregando dados...</span>
        </div>
      )}

      {erro && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle size={18} />
          <span className="text-sm">{erro}</span>
        </div>
      )}

      {!loading && !erro && (
        <div className="space-y-6">
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total de Clientes</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    {totalClientes?.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Users size={22} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Dias com cadastros</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    {clientesPorDia.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp size={22} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Média por dia</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    {clientesPorDia.length > 0
                      ? (totalClientes! / clientesPorDia.length).toFixed(1)
                      : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <TrendingUp size={22} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Pizza Status Atual + Pizza Kanban + Taxa de resposta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statusAtual.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Clientes por status atual</h2>
                <div className="flex items-center gap-6">
                  <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
                    {pizzaSlices(statusAtual.map(s => ({ nome: s.status, total: s.total }))).map((s, i) => (
                      <path key={i} d={s.path} fill={s.cor} stroke="white" strokeWidth="2" />
                    ))}
                  </svg>
                  <div className="flex flex-col gap-2 overflow-hidden">
                    {pizzaSlices(statusAtual.map(s => ({ nome: s.status, total: s.total }))).map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.cor }} />
                        <span className="text-xs text-gray-600 truncate flex-1">{s.nome.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-semibold text-gray-900 shrink-0">{s.total}</span>
                        <span className="text-xs text-gray-400 w-7 text-right shrink-0">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {kanban.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Clientes por etapa do Kanban</h2>
                <div className="flex items-center gap-8">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {pizzaSlices(kanban).map((s, i) => (
                      <path key={i} d={s.path} fill={s.cor} stroke="white" strokeWidth="2" />
                    ))}
                  </svg>
                  <div className="flex flex-col gap-2.5">
                    {pizzaSlices(kanban).map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.cor }} />
                        <span className="text-sm text-gray-700">{s.nome}</span>
                        <span className="text-sm font-semibold text-gray-900 ml-auto pl-4">{s.total}</span>
                        <span className="text-xs text-gray-400 w-8 text-right">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Taxa de resposta + barras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              const totalResp = atendimento.reduce((s, d) => s + d.comResposta, 0)
              const totalGeral = atendimento.reduce((s, d) => s + d.comResposta + d.semResposta, 0)
              const taxa = totalGeral > 0 ? Math.round((totalResp / totalGeral) * 100) : 0
              const r = 54
              const circ = 2 * Math.PI * r
              const dash = (taxa / 100) * circ
              return (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
                  <h2 className="font-semibold text-gray-900 mb-1">Taxa de resposta geral</h2>
                  <p className="text-xs text-gray-400 mb-6">Período selecionado — ao menos 3 mensagens</p>
                  <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
                        <circle
                          cx="70" cy="70" r={r} fill="none"
                          stroke={taxa >= 50 ? '#22c55e' : '#ef4444'}
                          strokeWidth="14"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${circ}`}
                          transform="rotate(-90 70 70)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{taxa}%</span>
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-500">
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-green-600 text-base">{totalResp}</span>
                        Responderam
                      </span>
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-red-400 text-base">{totalGeral - totalResp}</span>
                        Sem resposta
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Barras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clientes por dia — barras verticais */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Clientes por dia</h2>
                <p className="text-xs text-gray-400 mt-0.5">Período selecionado</p>
              </div>
              {clientesPorDia.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">Nenhum dado disponível.</div>
              ) : (
                <div className="p-6">
                  <div className="flex items-end gap-1.5 w-full" style={{ height: BAR_HEIGHT + 48 }}>
                    {clientesPorDia.map((item) => {
                      const h = Math.max((item.total / maxDia) * BAR_HEIGHT, 4)
                      return (
                        <div key={item.data} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <span className="text-xs font-semibold text-gray-700">{item.total}</span>
                          <div className="w-full flex items-end" style={{ height: BAR_HEIGHT }}>
                            <div
                              className="w-full bg-blue-500 rounded-t-md transition-all duration-500"
                              style={{ height: h }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 leading-tight text-center truncate w-full">
                            {item.data.slice(8)}/{item.data.slice(5, 7)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Atendimento vs Resposta — barras verticais empilhadas por dia */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Atendimento vs Resposta</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Período selecionado — ao menos 3 mensagens</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Responderam
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Sem resposta
                  </span>
                </div>
              </div>
              {atendimento.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">Nenhum dado disponível.</div>
              ) : (
                <div className="p-6">
                  <div className="flex items-end gap-1.5 w-full" style={{ height: BAR_HEIGHT + 48 }}>
                    {atendimento.map((item) => {
                      const total = item.comResposta + item.semResposta
                      const hVerde = (item.comResposta / maxAtend) * BAR_HEIGHT
                      const hVermelho = (item.semResposta / maxAtend) * BAR_HEIGHT
                      return (
                        <div key={item.data} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <span className="text-[10px] text-gray-500 font-medium">{total}</span>
                          <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: BAR_HEIGHT }}>
                            <div className="w-full bg-red-400 transition-all duration-500 flex items-center justify-center" style={{ height: hVermelho }}>
                              {hVermelho >= 16 && <span className="text-[10px] font-semibold text-white leading-none">{item.semResposta}</span>}
                            </div>
                            <div className="w-full bg-green-500 transition-all duration-500 flex items-center justify-center" style={{ height: hVerde }}>
                              {hVerde >= 16 && <span className="text-[10px] font-semibold text-white leading-none">{item.comResposta}</span>}
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 text-center leading-tight truncate w-full">
                            {item.data.slice(8)}/{item.data.slice(5, 7)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
