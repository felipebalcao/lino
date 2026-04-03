'use client'

import { useEffect, useState } from 'react'
import { Copy, Plus, Trash2, Link2, ChevronDown, ChevronUp, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  getRotators,
  criarRotator,
  deletarRotator,
  adicionarLink,
  deletarLink,
  toggleLink,
} from '@/services/gruposService'
import { GruposRotatorComLinks, GruposLink } from '@/types'

export default function GruposPage() {
  const [rotators, setRotators] = useState<GruposRotatorComLinks[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Novo rotator
  const [nomeNovoRotator, setNomeNovoRotator] = useState('')
  const [criandoRotator, setCriandoRotator] = useState(false)

  // Expansão de cards
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  // Formulário de novo link por rotator
  const [novoLink, setNovoLink] = useState<Record<string, { url: string; nome: string }>>({})
  const [adicionandoLink, setAdicionandoLink] = useState<string | null>(null)

  // Feedback de cópia
  const [copiado, setCopiado] = useState<string | null>(null)

  const origem =
    typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    try {
      setCarregando(true)
      setErro(null)
      const data = await getRotators()
      setRotators(data)
      if (data.length > 0) {
        setExpandidos(new Set([data[0].id]))
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar grupos')
    } finally {
      setCarregando(false)
    }
  }

  async function handleCriarRotator() {
    if (!nomeNovoRotator.trim()) return
    try {
      setCriandoRotator(true)
      const novo = await criarRotator(nomeNovoRotator.trim())
      setRotators((prev) => [{ ...novo, links: [] }, ...prev])
      setExpandidos((prev) => new Set([...prev, novo.id]))
      setNomeNovoRotator('')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar grupo')
    } finally {
      setCriandoRotator(false)
    }
  }

  async function handleDeletarRotator(id: string) {
    if (!confirm('Deletar este grupo e todos os links?')) return
    try {
      await deletarRotator(id)
      setRotators((prev) => prev.filter((r) => r.id !== id))
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao deletar grupo')
    }
  }

  async function handleAdicionarLink(rotatorId: string) {
    const form = novoLink[rotatorId]
    if (!form?.url?.trim()) return
    try {
      setAdicionandoLink(rotatorId)
      const link = await adicionarLink(rotatorId, form.url.trim(), form.nome)
      setRotators((prev) =>
        prev.map((r) =>
          r.id === rotatorId ? { ...r, links: [...r.links, link] } : r
        )
      )
      setNovoLink((prev) => ({ ...prev, [rotatorId]: { url: '', nome: '' } }))
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar link')
    } finally {
      setAdicionandoLink(null)
    }
  }

  async function handleDeletarLink(rotatorId: string, linkId: string) {
    try {
      await deletarLink(linkId)
      setRotators((prev) =>
        prev.map((r) =>
          r.id === rotatorId
            ? { ...r, links: r.links.filter((l) => l.id !== linkId) }
            : r
        )
      )
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao deletar link')
    }
  }

  async function handleToggleLink(rotatorId: string, link: GruposLink) {
    try {
      await toggleLink(link.id, !link.ativo)
      setRotators((prev) =>
        prev.map((r) =>
          r.id === rotatorId
            ? {
                ...r,
                links: r.links.map((l) =>
                  l.id === link.id ? { ...l, ativo: !l.ativo } : l
                ),
              }
            : r
        )
      )
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar link')
    }
  }

  function copiarLink(slug: string) {
    navigator.clipboard.writeText(`${origem}/g/${slug}`)
    setCopiado(slug)
    setTimeout(() => setCopiado(null), 2000)
  }

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Grupos</h1>
        <p className="text-gray-400 text-sm mt-1">
          Adicione grupos de WhatsApp e compartilhe um único link. O sistema distribui automaticamente quem entra em qual grupo.
        </p>
      </div>

      {/* Criar novo rotator */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nome do grupo (ex: Grupo VIP)"
          value={nomeNovoRotator}
          onChange={(e) => setNomeNovoRotator(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCriarRotator()}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
        />
        <button
          onClick={handleCriarRotator}
          disabled={criandoRotator || !nomeNovoRotator.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          {criandoRotator ? 'Criando...' : 'Novo grupo'}
        </button>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="text-gray-400 text-sm">Carregando...</div>
      ) : rotators.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p>Nenhum grupo criado ainda.</p>
          <p className="text-xs mt-1">Crie um grupo acima e adicione os links dos grupos do WhatsApp.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rotators.map((rotator) => {
            const expandido = expandidos.has(rotator.id)
            const form = novoLink[rotator.id] ?? { url: '', nome: '' }
            const linkPublico = `${origem}/g/${rotator.slug}`
            const ativos = rotator.links.filter((l) => l.ativo).length

            return (
              <div key={rotator.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                {/* Header do card */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpandido(rotator.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    {expandido ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    )}
                    <span className="font-semibold text-white">{rotator.nome}</span>
                    <span className="text-xs text-gray-400">
                      {ativos}/{rotator.links.length} grupo{rotator.links.length !== 1 ? 's' : ''} ativo{ativos !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Link público + botão copiar */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-600 rounded-lg px-2.5 py-1.5 max-w-[220px]">
                      <Link2 size={12} className="text-green-400 shrink-0" />
                      <span className="text-xs text-gray-300 truncate">/g/{rotator.slug}</span>
                    </div>
                    <button
                      onClick={() => copiarLink(rotator.slug)}
                      className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                      title="Copiar link"
                    >
                      {copiado === rotator.slug ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeletarRotator(rotator.id)}
                    className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors"
                    title="Deletar grupo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Links e formulário */}
                {expandido && (
                  <div className="border-t border-gray-700 px-4 py-3 space-y-2">
                    {rotator.links.length === 0 && (
                      <p className="text-gray-500 text-xs py-1">Nenhum link adicionado ainda.</p>
                    )}

                    {rotator.links.map((link) => (
                      <div
                        key={link.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                          link.ativo
                            ? 'bg-gray-700/50 border-gray-600'
                            : 'bg-gray-900/50 border-gray-700 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          {link.nome && (
                            <p className="text-xs font-medium text-white truncate">{link.nome}</p>
                          )}
                          <p className="text-xs text-gray-400 truncate">{link.url}</p>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{link.contador_acessos} acesso{link.contador_acessos !== 1 ? 's' : ''}</span>

                        <button
                          onClick={() => handleToggleLink(rotator.id, link)}
                          className="text-gray-400 hover:text-white transition-colors shrink-0"
                          title={link.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {link.ativo ? (
                            <ToggleRight size={20} className="text-green-400" />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeletarLink(rotator.id, link.id)}
                          className="p-1 rounded hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Formulário adicionar link */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="url"
                        placeholder="Link do grupo (https://chat.whatsapp.com/...)"
                        value={form.url}
                        onChange={(e) =>
                          setNovoLink((prev) => ({
                            ...prev,
                            [rotator.id]: { ...form, url: e.target.value },
                          }))
                        }
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                      <input
                        type="text"
                        placeholder="Nome (opcional)"
                        value={form.nome}
                        onChange={(e) =>
                          setNovoLink((prev) => ({
                            ...prev,
                            [rotator.id]: { ...form, nome: e.target.value },
                          }))
                        }
                        className="w-32 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                      <button
                        onClick={() => handleAdicionarLink(rotator.id)}
                        disabled={adicionandoLink === rotator.id || !form.url.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Plus size={13} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Users({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
