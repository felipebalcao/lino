'use client'

import { useEffect, useState, useMemo } from 'react'
import { getTodosClientesComContagem } from '@/services/clientesService'
import { Cliente } from '@/types'
import Avatar from '@/components/Avatar'
import { Search, Users, ArrowUpDown, MessageSquare, Download } from 'lucide-react'
import { STATUS_LIST } from '@/constants/status'

type ClienteComContagem = Cliente & { total_mensagens: number }
type Ordem = 'mensagens' | 'nome' | 'data'

const statusMap = Object.fromEntries(STATUS_LIST.map((s) => [s.key, s]))

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteComContagem[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('mensagens')

  useEffect(() => {
    getTodosClientesComContagem()
      .then(setClientes)
      .finally(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    const lista = q
      ? clientes.filter(
          (c) =>
            c.nome?.toLowerCase().includes(q) ||
            c.telefone?.includes(q) ||
            c.cidade?.toLowerCase().includes(q),
        )
      : clientes

    return [...lista].sort((a, b) => {
      if (ordem === 'mensagens') return b.total_mensagens - a.total_mensagens
      if (ordem === 'nome') return (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [clientes, busca, ordem])

  function toggleOrdem(col: Ordem) {
    setOrdem(col)
  }

  function baixarCSV() {
    const cabecalho = ['Nome', 'Telefone', 'Cidade', 'Status', 'Mensagens', 'Cadastrado em']
    const linhas = filtrados.map((c) => [
      c.nome ?? '',
      c.telefone ?? '',
      c.cidade ?? '',
      c.status_atual ? (statusMap[c.status_atual]?.label ?? c.status_atual) : '',
      String(c.total_mensagens),
      formatarData(c.created_at),
    ])
    const csv = [cabecalho, ...linhas]
      .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-8 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={22} /> Clientes
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{filtrados.length} de {clientes.length} clientes</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={baixarCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download size={15} /> Exportar CSV
            </button>
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto px-8 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="pb-3 font-medium w-8">#</th>
              <th className="pb-3 font-medium">
                <button
                  onClick={() => toggleOrdem('nome')}
                  className={`flex items-center gap-1 hover:text-gray-800 transition-colors ${ordem === 'nome' ? 'text-gray-900' : ''}`}
                >
                  Nome <ArrowUpDown size={13} />
                </button>
              </th>
              <th className="pb-3 font-medium">Telefone</th>
              <th className="pb-3 font-medium">Cidade</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">
                <button
                  onClick={() => toggleOrdem('mensagens')}
                  className={`flex items-center gap-1 hover:text-gray-800 transition-colors ${ordem === 'mensagens' ? 'text-gray-900' : ''}`}
                >
                  Mensagens <ArrowUpDown size={13} />
                </button>
              </th>
              <th className="pb-3 font-medium">
                <button
                  onClick={() => toggleOrdem('data')}
                  className={`flex items-center gap-1 hover:text-gray-800 transition-colors ${ordem === 'data' ? 'text-gray-900' : ''}`}
                >
                  Desde <ArrowUpDown size={13} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
            {filtrados.map((c, i) => {
              const statusInfo = c.status_atual ? statusMap[c.status_atual] : null
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nome={c.nome ?? ''} foto={c.foto} size="sm" />
                      <span className="font-medium text-gray-900 truncate max-w-48">{c.nome || '—'}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600 font-mono text-xs">{c.telefone}</td>
                  <td className="py-3 text-gray-500">{c.cidade || '—'}</td>
                  <td className="py-3">
                    {statusInfo ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: statusInfo.cor }}
                      >
                        {statusInfo.label}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <MessageSquare size={13} className="text-gray-400" />
                      <span className="font-medium">{c.total_mensagens}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">{formatarData(c.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
