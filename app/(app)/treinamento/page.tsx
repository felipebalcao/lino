'use client'

import { useEffect, useState, useRef } from 'react'
import {
  BookOpen, Plus, Trash2, Loader2, Sparkles, ChevronDown, ChevronUp,
  FileText, MessageSquareQuote, AlignLeft, Upload, CheckCircle, AlertCircle,
} from 'lucide-react'
import { TreinamentoQA, TreinamentoTexto, BaseConhecimento } from '@/types'

type Aba = 'prompt' | 'qa' | 'textos' | 'arquivos'

export default function TreinamentoPage() {
  const [aba, setAba] = useState<Aba>('prompt')

  // Prompt
  const [prompt, setPrompt] = useState('')
  const [salvandoPrompt, setSalvandoPrompt] = useState(false)
  const [promptSalvo, setPromptSalvo] = useState(false)

  // Q&A
  const [qas, setQas] = useState<TreinamentoQA[]>([])
  const [novaPergunta, setNovaPergunta] = useState('')
  const [novaResposta, setNovaResposta] = useState('')
  const [adicionandoQA, setAdicionandoQA] = useState(false)
  const [formQAAberto, setFormQAAberto] = useState(false)

  // Textos
  const [textos, setTextos] = useState<TreinamentoTexto[]>([])
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoConteudo, setNovoConteudo] = useState('')
  const [adicionandoTexto, setAdicionandoTexto] = useState(false)
  const [formTextoAberto, setFormTextoAberto] = useState(false)

  // Arquivos
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadando, setUploadando] = useState(false)

  // Geração
  const [gerando, setGerando] = useState(false)
  const [erroGerar, setErroGerar] = useState<string | null>(null)
  const [base, setBase] = useState<BaseConhecimento | null>(null)
  const [baseExpandida, setBaseExpandida] = useState(false)

  // Erro geral
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    setErro(null)
    const [promptRes, qaRes, textosRes, baseRes] = await Promise.all([
      fetch('/api/treinamento/prompt'),
      fetch('/api/treinamento/qa'),
      fetch('/api/treinamento/textos'),
      fetch('/api/base-conhecimento'),
    ])

    if (promptRes.ok) {
      const d = await promptRes.json()
      setPrompt(d.conteudo ?? '')
    }
    if (qaRes.ok) setQas(await qaRes.json())
    if (textosRes.ok) setTextos(await textosRes.json())
    if (baseRes.ok) setBase(await baseRes.json())
  }

  // --- Prompt ---
  async function salvarPrompt() {
    setSalvandoPrompt(true)
    setPromptSalvo(false)
    const res = await fetch('/api/treinamento/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudo: prompt }),
    })
    setSalvandoPrompt(false)
    if (res.ok) {
      setPromptSalvo(true)
      setTimeout(() => setPromptSalvo(false), 3000)
    }
  }

  // --- Q&A ---
  async function adicionarQA() {
    if (!novaPergunta.trim() || !novaResposta.trim()) return
    setAdicionandoQA(true)
    const res = await fetch('/api/treinamento/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta: novaPergunta, resposta: novaResposta }),
    })
    if (res.ok) {
      const novo = await res.json()
      setQas((prev) => [...prev, novo])
      setNovaPergunta('')
      setNovaResposta('')
      setFormQAAberto(false)
    }
    setAdicionandoQA(false)
  }

  async function deletarQA(id: number) {
    await fetch(`/api/treinamento/qa/${id}`, { method: 'DELETE' })
    setQas((prev) => prev.filter((q) => q.id !== id))
  }

  // --- Textos ---
  async function adicionarTexto() {
    if (!novoTitulo.trim() || !novoConteudo.trim()) return
    setAdicionandoTexto(true)
    const res = await fetch('/api/treinamento/textos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: novoTitulo, conteudo: novoConteudo }),
    })
    if (res.ok) {
      const novo = await res.json()
      setTextos((prev) => [...prev, novo])
      setNovoTitulo('')
      setNovoConteudo('')
      setFormTextoAberto(false)
    }
    setAdicionandoTexto(false)
  }

  async function deletarTexto(id: number) {
    await fetch(`/api/treinamento/textos/${id}`, { method: 'DELETE' })
    setTextos((prev) => prev.filter((t) => t.id !== id))
  }

  // --- Arquivos ---
  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    if (!arquivo.name.endsWith('.txt')) {
      setErro('Apenas arquivos .txt são suportados por enquanto.')
      return
    }
    setUploadando(true)
    setErro(null)
    const conteudo = await arquivo.text()
    const res = await fetch('/api/treinamento/textos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: arquivo.name, conteudo }),
    })
    if (res.ok) {
      const novo = await res.json()
      setTextos((prev) => [...prev, novo])
      setAba('textos')
    }
    setUploadando(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Gerar ---
  async function gerarBase() {
    setGerando(true)
    setErroGerar(null)
    const res = await fetch('/api/treinamento/gerar', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setErroGerar(data.error ?? 'Erro ao gerar base de conhecimento.')
    } else {
      setBase(data.base)
      setBaseExpandida(true)
    }
    setGerando(false)
  }

  const abas: { id: Aba; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'prompt', label: 'Prompt', icon: AlignLeft },
    { id: 'qa', label: 'Perguntas & Respostas', icon: MessageSquareQuote, count: qas.length },
    { id: 'textos', label: 'Textos', icon: FileText, count: textos.length },
    { id: 'arquivos', label: 'Arquivos', icon: Upload },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <BookOpen size={18} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Treinamento do Agente</h1>
            <p className="text-xs text-gray-500">Adicione informações e gere a base de conhecimento</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle size={16} />
            {erro}
          </div>
        )}

        {/* Abas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {abas.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                  aba === id
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {label}
                {count !== undefined && count > 0 && (
                  <span className="ml-1 bg-purple-100 text-purple-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Aba: Prompt */}
            {aba === 'prompt' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Defina a personalidade, tom de voz e instruções gerais do agente.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={10}
                  placeholder="Ex: Você é um assistente de atendimento da empresa X. Responda sempre de forma educada e objetiva. Nunca forneça preços sem consultar o cliente sobre o produto desejado..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={salvarPrompt}
                    disabled={salvandoPrompt}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {salvandoPrompt ? <Loader2 size={15} className="animate-spin" /> : null}
                    Salvar prompt
                  </button>
                  {promptSalvo && (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle size={14} /> Salvo!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Aba: Q&A */}
            {aba === 'qa' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Adicione pares de perguntas e respostas frequentes.
                  </p>
                  <button
                    onClick={() => setFormQAAberto((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>

                {formQAAberto && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                    <input
                      type="text"
                      value={novaPergunta}
                      onChange={(e) => setNovaPergunta(e.target.value)}
                      placeholder="Pergunta"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <textarea
                      value={novaResposta}
                      onChange={(e) => setNovaResposta(e.target.value)}
                      placeholder="Resposta"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={adicionarQA}
                        disabled={adicionandoQA || !novaPergunta.trim() || !novaResposta.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {adicionandoQA ? <Loader2 size={14} className="animate-spin" /> : null}
                        Salvar
                      </button>
                      <button
                        onClick={() => { setFormQAAberto(false); setNovaPergunta(''); setNovaResposta('') }}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {qas.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Nenhuma pergunta adicionada ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {qas.map((qa) => (
                      <div key={qa.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{qa.pergunta}</p>
                            <p className="text-sm text-gray-500 mt-1">{qa.resposta}</p>
                          </div>
                          <button
                            onClick={() => deletarQA(qa.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aba: Textos */}
            {aba === 'textos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Adicione blocos de texto com informações sobre a empresa, produtos, políticas, etc.
                  </p>
                  <button
                    onClick={() => setFormTextoAberto((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>

                {formTextoAberto && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                    <input
                      type="text"
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                      placeholder="Título (ex: Horário de funcionamento)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <textarea
                      value={novoConteudo}
                      onChange={(e) => setNovoConteudo(e.target.value)}
                      placeholder="Conteúdo..."
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={adicionarTexto}
                        disabled={adicionandoTexto || !novoTitulo.trim() || !novoConteudo.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {adicionandoTexto ? <Loader2 size={14} className="animate-spin" /> : null}
                        Salvar
                      </button>
                      <button
                        onClick={() => { setFormTextoAberto(false); setNovoTitulo(''); setNovoConteudo('') }}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {textos.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Nenhum texto adicionado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {textos.map((texto) => (
                      <div key={texto.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{texto.titulo}</p>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-3">{texto.conteudo}</p>
                          </div>
                          <button
                            onClick={() => deletarTexto(texto.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aba: Arquivos */}
            {aba === 'arquivos' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Faça upload de arquivos <strong>.txt</strong>. O conteúdo será adicionado automaticamente como um bloco de texto.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  {uploadando ? (
                    <Loader2 size={32} className="text-purple-500 animate-spin" />
                  ) : (
                    <Upload size={32} className="text-gray-400" />
                  )}
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      {uploadando ? 'Processando arquivo...' : 'Clique para selecionar um arquivo'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Apenas .txt por enquanto</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleArquivo}
                  className="hidden"
                />

                {textos.length > 0 && (
                  <p className="text-xs text-gray-400 text-center">
                    {textos.length} bloco{textos.length !== 1 ? 's' : ''} de texto salvo{textos.length !== 1 ? 's' : ''} — veja na aba <strong>Textos</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bloco: Gerar Base de Conhecimento */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-purple-500" />
                Base de Conhecimento
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                A OpenAI consolida todos os dados acima em um único bloco para o agente usar.
              </p>
            </div>
            <button
              onClick={gerarBase}
              disabled={gerando}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {gerando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {gerando ? 'Gerando...' : 'Gerar agora'}
            </button>
          </div>

          {erroGerar && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {erroGerar}
            </div>
          )}

          {base && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setBaseExpandida((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-700">
                    Última geração —{' '}
                    {new Date(base.gerado_em).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {base.tokens_total != null && (
                    <span className="text-xs text-gray-400">
                      {base.tokens_total.toLocaleString('pt-BR')} tokens
                      <span className="text-gray-300 mx-1">·</span>
                      <span className="text-gray-400">{base.tokens_prompt} entrada</span>
                      <span className="text-gray-300 mx-1">+</span>
                      <span className="text-gray-400">{base.tokens_resposta} saída</span>
                    </span>
                  )}
                </div>
                {baseExpandida ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {baseExpandida && (
                <pre className="px-4 py-4 text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
                  {base.conteudo}
                </pre>
              )}
            </div>
          )}

          {!base && !erroGerar && (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhuma base gerada ainda. Adicione informações nas abas acima e clique em <strong>Gerar agora</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
