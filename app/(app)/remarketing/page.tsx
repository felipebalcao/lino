'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Bell, CheckCircle, AlertCircle, Copy, Play } from 'lucide-react'

interface Regra {
  id: string
  status_alvo: string
  tempo_horas: number
  mensagem: string
  ativo: boolean
  created_at: string
}

const STATUS_OPCOES = [
  'novo_lead',
  'em_atendimento',
  'aguardando_cliente',
  'orcamento_enviado',
  'negociando',
  'intencao_compra',
  'pagamento_pendente',
  'compra_realizada',
  'pos_venda',
  'inativo',
]

function formatarWhatsApp(texto: string): string {
  return texto
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

export default function RemarketingPage() {
  const [regras, setRegras] = useState<Regra[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [executando, setExecutando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Form nova regra
  const [statusAlvo, setStatusAlvo] = useState(STATUS_OPCOES[0])
  const [tempoHoras, setTempoHoras] = useState(24)
  const [limite, setLimite] = useState<number | ''>(10)
  const [intervaloSegundos, setIntervaloSegundos] = useState<number>(3)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarRegras()
  }, [])

  function mostrarFeedback(tipo: 'ok' | 'erro', msg: string) {
    setFeedback({ tipo, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function carregarRegras() {
    setLoading(true)
    const res = await fetch('/api/remarketing/regras')
    const data = await res.json()
    setRegras(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function criarRegra() {
    if (!mensagem.trim()) return
    setSalvando(true)
    try {
      const res = await fetch('/api/remarketing/regras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_alvo: statusAlvo, tempo_horas: tempoHoras, mensagem, limite, intervalo_segundos: intervaloSegundos }),
      })
      if (!res.ok) throw new Error('Erro ao criar')
      await carregarRegras()
      setMostrarForm(false)
      setMensagem('')
      setTempoHoras(24)
      setLimite(10)
      setIntervaloSegundos(3)
      mostrarFeedback('ok', 'Regra criada com sucesso!')
    } catch {
      mostrarFeedback('erro', 'Erro ao criar regra.')
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(regra: Regra) {
    const res = await fetch(`/api/remarketing/regras/${regra.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !regra.ativo }),
    })
    if (res.ok) {
      setRegras((prev) => prev.map((r) => r.id === regra.id ? { ...r, ativo: !r.ativo } : r))
    }
  }

  async function deletarRegra(id: string) {
    if (!confirm('Deletar esta regra?')) return
    const res = await fetch(`/api/remarketing/regras/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRegras((prev) => prev.filter((r) => r.id !== id))
      mostrarFeedback('ok', 'Regra removida.')
    } else {
      mostrarFeedback('erro', 'Erro ao deletar.')
    }
  }

  async function executarAgora() {
    setExecutando(true)
    try {
      const res = await fetch('/api/remarketing/executar', { method: 'POST' })
      const data = await res.json()
      mostrarFeedback('ok', `Execução concluída: ${data.enviados ?? 0} mensagens enviadas.`)
    } catch {
      mostrarFeedback('erro', 'Erro ao executar.')
    } finally {
      setExecutando(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remarketing Automático</h1>
          <p className="text-gray-500 text-sm mt-1">
            Envie mensagens automaticamente para clientes parados em um status por tempo determinado.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={executarAgora}
            disabled={executando}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {executando ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            Executar agora
          </button>
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nova regra
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-6 ${
          feedback.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.tipo === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
        </div>
      )}

      {/* Formulário nova regra */}
      {mostrarForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-5">Nova regra de remarketing</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Status alvo</label>
              <select
                value={statusAlvo}
                onChange={(e) => setStatusAlvo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tempo parado (h)</label>
              <input
                type="number"
                min={1}
                value={tempoHoras}
                onChange={(e) => setTempoHoras(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Limite <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="Ex: 10"
                value={limite}
                onChange={(e) => setLimite(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Intervalo (seg)</label>
              <input
                type="number"
                min={1}
                value={intervaloSegundos}
                onChange={(e) => setIntervaloSegundos(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mensagem — use{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">{'{{nome_cliente}}'}</code> e{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">{'{{cidade}}'}</code>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Olá {{nome_cliente}}, tudo bem? Vimos que você ainda não finalizou seu pedido..."
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono"
              />
              {/* Preview */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Preview</p>
                <div className="bg-[#ECE5DD] rounded-lg p-3 min-h-[120px]">
                  {mensagem ? (
                    <div className="bg-white rounded-lg rounded-tr-none shadow-sm px-3 py-2 max-w-[90%] ml-auto">
                      <p
                        className="text-sm text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: formatarWhatsApp(
                            mensagem
                              .replace(/\{\{nome_cliente\}\}/gi, 'João')
                              .replace(/\{\{nome\}\}/gi, 'João')
                              .replace(/\{\{cidade\}\}/gi, 'São Paulo')
                          ),
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 text-xs pt-4">Preview da mensagem</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => { setMostrarForm(false); setMensagem('') }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={criarRegra}
              disabled={salvando || !mensagem.trim() || !limite}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Criar regra
            </button>
          </div>
        </div>
      )}

      {/* Lista de regras */}
      {loading ? (
        <div className="flex items-center gap-3 text-gray-500 py-8">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : regras.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Bell size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma regra criada ainda.</p>
          <p className="text-gray-400 text-xs mt-1">
            Clique em &quot;Nova regra&quot; para começar a automatizar seu remarketing.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {regras.map((regra) => (
            <div
              key={regra.id}
              className={`bg-white rounded-xl border shadow-sm p-5 transition-opacity ${
                regra.ativo ? 'border-gray-200 opacity-100' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {regra.status_alvo.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      parado por <strong>{regra.tempo_horas}h</strong>
                    </span>
                    <span className="text-xs text-gray-500">
                      limite <strong>{regra.limite ?? '—'}</strong>
                    </span>
                    <span className="text-xs text-gray-500">
                      intervalo <strong>{regra.intervalo_segundos ?? 3}s</strong>
                    </span>
                    {!regra.ativo && (
                      <span className="text-xs text-gray-400 italic">inativa</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3 mb-3">{regra.mensagem}</p>

                  {/* Webhook URL */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <code className="text-xs text-gray-500 truncate flex-1 select-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/api/remarketing/executar/{regra.id}
                    </code>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/api/remarketing/executar/${regra.id}`
                        navigator.clipboard.writeText(url)
                        mostrarFeedback('ok', 'Webhook copiado!')
                      }}
                      title="Copiar webhook"
                      className="text-gray-400 hover:text-gray-700 shrink-0"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/remarketing/executar/${regra.id}`, { method: 'POST' })
                      const data = await res.json()
                      mostrarFeedback('ok', `Executado: ${data.enviados ?? 0} enviados`)
                    }}
                    title="Executar agora"
                    className="text-gray-400 hover:text-green-600 transition-colors"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={() => toggleAtivo(regra)}
                    title={regra.ativo ? 'Desativar' : 'Ativar'}
                    className="text-gray-400 hover:text-green-600 transition-colors"
                  >
                    {regra.ativo ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                  </button>
                  <button
                    onClick={() => deletarRegra(regra.id)}
                    title="Deletar"
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        Cada cliente recebe a mensagem apenas uma vez por regra. Configure o webhook no n8n com um Schedule a cada 10 minutos.
      </p>
    </div>
  )
}
