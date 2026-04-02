'use client'

import { useEffect, useRef, useState } from 'react'
import { MensagemWhatsapp, Cliente, KanbanSecao } from '@/types'
import { Loader2, MessageSquare, Send, ChevronDown, AlertCircle, RotateCcw } from 'lucide-react'

import Avatar from './Avatar'
import { supabase } from '@/lib/supabase'
import { getSecoes, moverClienteParaSecao } from '@/services/kanbanService'

interface Props {
  cliente: Cliente | null
  mensagens: MensagemWhatsapp[]
  loading: boolean
  onMensagemEnviada?: (msg: MensagemWhatsapp) => void
}

function isJsonMessage(mensagem: string): boolean {
  const trimmed = mensagem.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

function formatarDataHora(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ChatMensagens({ cliente, mensagens, loading, onMensagemEnviada }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [texto, setTexto] = useState('')
  const [errosPorId, setErrosPorId] = useState<Record<number, string>>({})
  const [secoes, setSecoes] = useState<KanbanSecao[]>([])
  const [secaoAtual, setSecaoAtual] = useState<number | null>(null)
  const [salvandoSecao, setSalvandoSecao] = useState(false)

  useEffect(() => {
    getSecoes().then(setSecoes).catch(() => {})
  }, [])

  useEffect(() => {
    setSecaoAtual(cliente?.kanban_secao_id ?? null)
  }, [cliente?.id])

  async function handleMudarSecao(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!cliente) return
    const valor = e.target.value
    const novaSecaoId = valor === '' ? null : Number(valor)
    setSecaoAtual(novaSecaoId)
    setSalvandoSecao(true)
    try {
      await moverClienteParaSecao(cliente.id, novaSecaoId)
    } finally {
      setSalvandoSecao(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviarMensagem(mensagemTexto: string, msgId: number) {
    if (!cliente) return
    try {
      const [res] = await Promise.all([
        fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numero: cliente.telefone, mensagem: mensagemTexto }),
        }),
        supabase.from('mensagens_whatsapp').insert({
          numero_cliente: cliente.telefone,
          mensagem: mensagemTexto,
          status: 'processando',
          quem_mandou: 'manual',
        }),
      ])
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao enviar')
      }
      // Remove erro se tinha
      setErrosPorId((prev) => { const n = { ...prev }; delete n[msgId]; return n })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar mensagem'
      setErrosPorId((prev) => ({ ...prev, [msgId]: msg }))
    }
  }

  async function handleEnviar() {
    if (!texto.trim() || !cliente) return

    const mensagemTexto = texto.trim()
    const msgId = Date.now()
    const agora = new Date().toISOString()

    const msgOtimista: MensagemWhatsapp = {
      id: msgId,
      cliente_id: cliente.id,
      numero_cliente: cliente.telefone,
      mensagem: mensagemTexto,
      quem_mandou: 'manual',
      status: 'processando',
      lote_id: null,
      data_criacao: agora,
    }
    onMensagemEnviada?.(msgOtimista)
    setTexto('')
    inputRef.current?.focus()

    // Envia em background — input já liberado
    enviarMensagem(mensagemTexto, msgId)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 bg-gray-50">
        <MessageSquare size={52} strokeWidth={1.2} />
        <div className="text-center">
          <p className="font-medium text-gray-600">Selecione um cliente</p>
          <p className="text-sm mt-1">Escolha uma conversa na lista ao lado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <Avatar nome={cliente.nome} foto={cliente.foto} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{cliente.nome}</p>
          <p className="text-xs text-gray-400">{cliente.telefone}{cliente.cidade ? ` · ${cliente.cidade}` : ''}</p>
          {(cliente.origem_app || cliente.origem_url) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {cliente.origem_app && (
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium capitalize">
                  {cliente.origem_app}
                </span>
              )}
              {cliente.origem_url && (
                <a
                  href={cliente.origem_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gray-400 hover:text-blue-500 truncate max-w-[200px]"
                >
                  {cliente.origem_url.replace('https://www.facebook.com/', 'fb.com/')}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <select
            value={secaoAtual ?? ''}
            onChange={handleMudarSecao}
            disabled={salvandoSecao}
            className="appearance-none pl-3 pr-7 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer disabled:opacity-60"
          >
            <option value="">Sem seção</option>
            {secoes.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3 bg-[#f0f2f5]">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {!loading && (() => {
          const visiveis = mensagens.filter((msg) => !isJsonMessage(msg.mensagem))
          if (mensagens.length === 0 || visiveis.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-16">
                <MessageSquare size={36} strokeWidth={1.5} />
                <p className="text-sm">Nenhuma mensagem encontrada</p>
              </div>
            )
          }
          return visiveis.map((msg) => {
            const quem = msg.quem_mandou?.toLowerCase()
            const isCliente = quem === 'cliente'
            const isManual = quem === 'manual'
            const erro = errosPorId[msg.id]
            return (
              <div key={msg.id} className={`flex ${isCliente ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex items-end gap-1.5 ${isCliente ? 'flex-row' : 'flex-row-reverse'}`}>
                  {erro && (
                    <button
                      onClick={() => enviarMensagem(msg.mensagem, msg.id)}
                      title={erro}
                      className="text-red-500 hover:text-red-600 shrink-0 mb-1"
                    >
                      <AlertCircle size={16} />
                    </button>
                  )}
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${
                      erro
                        ? 'bg-red-100 text-red-800 rounded-tr-sm'
                        : isCliente
                        ? 'bg-white text-gray-800 rounded-tl-sm'
                        : isManual
                        ? 'bg-blue-500 text-white rounded-tr-sm'
                        : 'bg-green-500 text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.mensagem}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isCliente ? 'justify-start' : 'justify-end'}`}>
                      <span className={`text-[10px] ${erro ? 'text-red-400' : isCliente ? 'text-gray-400' : isManual ? 'text-blue-100' : 'text-green-100'}`}>
                        {formatarDataHora(msg.data_criacao)}
                      </span>
                      {erro ? (
                        <button onClick={() => enviarMensagem(msg.mensagem, msg.id)} className="text-[10px] text-red-500 flex items-center gap-0.5 hover:underline">
                          <RotateCcw size={10} /> Tentar novamente
                        </button>
                      ) : !isCliente && msg.status && (
                        <span className={`text-[10px] ${isManual ? 'text-blue-100' : 'text-green-100'}`}>· {msg.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        })()}

        <div ref={bottomRef} />
      </div>

      {/* Input de envio */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem... (Enter para enviar)"
            rows={1}
            className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={handleEnviar}
            disabled={!texto.trim()}
            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
