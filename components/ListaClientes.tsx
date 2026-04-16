'use client'

import { ClienteComUltimaMensagem } from '@/types'
import { MessageSquare } from 'lucide-react'
import Avatar from './Avatar'

interface Props {
  clientes: ClienteComUltimaMensagem[]
  clienteSelecionadoId: number | null
  onSelecionar: (cliente: ClienteComUltimaMensagem) => void
}

function formatarHora(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarData(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)

  if (d.toDateString() === hoje.toDateString()) return formatarHora(dateStr)
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function extrairPreview(mensagem: string | null | undefined): string {
  if (!mensagem) return ''
  const texto = mensagem.trim()
  if (texto.startsWith('{')) {
    try {
      const obj = JSON.parse(texto)
      return obj?.text?.trim() || obj?.caption?.trim() || ''
    } catch {
      return ''
    }
  }
  return texto
}

function formatarDataCompleta(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ListaClientes({ clientes, clienteSelecionadoId, onSelecionar }: Props) {
  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 p-6">
        <MessageSquare size={40} strokeWidth={1.5} />
        <p className="text-sm">Nenhum cliente encontrado</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {clientes.map((cliente) => {
        const ativo = cliente.id === clienteSelecionadoId
        const temMensagem = !!cliente.ultima_mensagem

        return (
          <li key={cliente.id}>
            <button
              onClick={() => onSelecionar(cliente)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${
                ativo ? 'bg-green-50 hover:bg-green-50' : ''
              }`}
            >
              <Avatar nome={cliente.nome} foto={cliente.foto} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 text-sm truncate">{cliente.nome}</span>
                  {temMensagem && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatarData(cliente.ultima_mensagem!.data_criacao)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {temMensagem
                    ? extrairPreview(cliente.ultima_mensagem!.mensagem)
                    : cliente.cidade || cliente.telefone}
                </p>
                {formatarDataCompleta(temMensagem ? cliente.ultima_mensagem!.data_criacao : cliente.created_at) && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatarDataCompleta(temMensagem ? cliente.ultima_mensagem!.data_criacao : cliente.created_at)}
                  </p>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
