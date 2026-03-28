'use client'

import { useEffect, useState, useRef } from 'react'
import { getSecoes, criarSecao, deletarSecao, getClientesPorSecao, moverClienteParaSecao } from '@/services/kanbanService'
import { KanbanSecao, Cliente } from '@/types'
import Avatar from '@/components/Avatar'
import { Plus, X, Loader2, Kanban } from 'lucide-react'

export default function KanbanPage() {
  const [secoes, setSecoes] = useState<KanbanSecao[]>([])
  const [clientes, setClientes] = useState<Record<string, Cliente[]>>({})
  const [loading, setLoading] = useState(true)
  const [novaSecao, setNovaSecao] = useState('')
  const [criando, setCriando] = useState(false)
  const [mostrarInput, setMostrarInput] = useState(false)
  const [dragClienteId, setDragClienteId] = useState<number | null>(null)
  const [dragSobreSecao, setDragSobreSecao] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([getSecoes(), getClientesPorSecao()])
      setSecoes(s)
      setClientes(c)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (mostrarInput) inputRef.current?.focus()
  }, [mostrarInput])

  async function handleCriarSecao(e: React.FormEvent) {
    e.preventDefault()
    if (!novaSecao.trim()) return
    setCriando(true)
    try {
      const nova = await criarSecao(novaSecao)
      setSecoes((prev) => [...prev, nova])
      setClientes((prev) => ({ ...prev, [String(nova.id)]: [] }))
      setNovaSecao('')
      setMostrarInput(false)
    } finally {
      setCriando(false)
    }
  }

  async function handleDeletarSecao(id: number) {
    if (!confirm('Deletar esta seção? Os clientes voltarão para "Sem seção".')) return
    await deletarSecao(id)
    setSecoes((prev) => prev.filter((s) => s.id !== id))
    await carregar()
  }

  function handleDragStart(e: React.DragEvent, clienteId: number) {
    setDragClienteId(clienteId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, secaoKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragSobreSecao(secaoKey)
  }

  function handleDragLeave() {
    setDragSobreSecao(null)
  }

  async function handleDrop(e: React.DragEvent, secaoKey: string) {
    e.preventDefault()
    setDragSobreSecao(null)
    if (!dragClienteId) return

    const secaoId = secaoKey === 'sem_secao' ? null : Number(secaoKey)

    // Atualiza local otimistamente
    setClientes((prev) => {
      const novo = { ...prev }
      let clienteMovido: Cliente | undefined

      // Remove de todas as colunas
      for (const key of Object.keys(novo)) {
        const idx = novo[key].findIndex((c) => c.id === dragClienteId)
        if (idx !== -1) {
          clienteMovido = { ...novo[key][idx], kanban_secao_id: secaoId }
          novo[key] = novo[key].filter((c) => c.id !== dragClienteId)
          break
        }
      }

      if (clienteMovido) {
        if (!novo[secaoKey]) novo[secaoKey] = []
        novo[secaoKey] = [...novo[secaoKey], clienteMovido]
      }

      return novo
    })

    setDragClienteId(null)
    await moverClienteParaSecao(dragClienteId, secaoId)
  }

  const colunas: { key: string; nome: string; secaoId?: number }[] = [
    { key: 'sem_secao', nome: 'Sem seção' },
    ...secoes.map((s) => ({ key: String(s.id), nome: s.nome, secaoId: s.id })),
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-8 py-6 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Kanban size={22} /> Kanban
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{secoes.length} seções · {Object.values(clientes).flat().length} clientes</p>
        </div>

        <div className="flex items-center gap-3">
          {mostrarInput ? (
            <form onSubmit={handleCriarSecao} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={novaSecao}
                onChange={(e) => setNovaSecao(e.target.value)}
                placeholder="Nome da seção..."
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 w-48"
              />
              <button
                type="submit"
                disabled={criando || !novaSecao.trim()}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {criando ? <Loader2 size={14} className="animate-spin" /> : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => { setMostrarInput(false); setNovaSecao('') }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setMostrarInput(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={16} /> Nova seção
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full px-8 py-6" style={{ minWidth: 'max-content' }}>
          {colunas.map(({ key, nome, secaoId }) => {
            const cards = clientes[key] ?? []
            const isDragOver = dragSobreSecao === key

            return (
              <div
                key={key}
                className="flex flex-col w-72 shrink-0"
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key)}
              >
                {/* Cabeçalho da coluna */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{nome}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                      {cards.length}
                    </span>
                  </div>
                  {secaoId && (
                    <button
                      onClick={() => handleDeletarSecao(secaoId)}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Coluna */}
                <div
                  className={`flex-1 rounded-xl p-2 space-y-2 overflow-y-auto transition-colors ${
                    isDragOver
                      ? 'bg-green-50 border-2 border-dashed border-green-400'
                      : 'bg-gray-100 border-2 border-transparent'
                  }`}
                  style={{ minHeight: '200px', maxHeight: 'calc(100vh - 220px)' }}
                >
                  {cards.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-gray-400 text-xs">
                      Arraste clientes aqui
                    </div>
                  )}

                  {cards.map((cliente) => (
                    <div
                      key={cliente.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cliente.id)}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar nome={cliente.nome} foto={cliente.foto} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{cliente.nome}</p>
                          <p className="text-xs text-gray-400 truncate">{cliente.cidade || cliente.telefone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
