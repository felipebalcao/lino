'use client'

import { useEffect, useState, useCallback } from 'react'
import { Smartphone, Plus, Trash2, Loader2, RefreshCw, X, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react'

interface Instancia {
  id: string
  nome: string
  token: string
  telefone: string | null
  status: string
  ativo: boolean
  created_at: string
}

export default function ConexaoPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoToken, setNovoToken] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // QR code state por instância
  const [qrData, setQrData] = useState<Record<string, string | null>>({})
  const [loadingQr, setLoadingQr] = useState<Record<string, boolean>>({})
  const [checkingStatus, setCheckingStatus] = useState<Record<string, boolean>>({})

  const carregar = useCallback(async () => {
    const res = await fetch('/api/instancias')
    if (res.ok) setInstancias(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function mostrarFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function criarInstancia() {
    if (!novoNome.trim() || !novoToken.trim()) return
    setSalvando(true)
    setErro(null)
    const res = await fetch('/api/instancias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, token: novoToken }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErro(data.error ?? 'Erro ao criar instância')
    } else {
      setInstancias((prev) => [...prev, data])
      setNovoNome('')
      setNovoToken('')
      setMostrarForm(false)
      mostrarFeedback('Instância criada!')
    }
    setSalvando(false)
  }

  async function deletarInstancia(id: string) {
    if (!confirm('Remover esta instância?')) return
    await fetch(`/api/instancias/${id}`, { method: 'DELETE' })
    setInstancias((prev) => prev.filter((i) => i.id !== id))
    mostrarFeedback('Instância removida.')
  }

  async function gerarQR(id: string) {
    setLoadingQr((prev) => ({ ...prev, [id]: true }))
    setQrData((prev) => ({ ...prev, [id]: null }))
    const res = await fetch(`/api/instancias/${id}/qr`)
    const data = await res.json()
    const qr = data?.qrcode || data?.base64 || data?.qr || null
    setQrData((prev) => ({ ...prev, [id]: qr }))
    setLoadingQr((prev) => ({ ...prev, [id]: false }))
  }

  async function verificarStatus(id: string) {
    setCheckingStatus((prev) => ({ ...prev, [id]: true }))
    const res = await fetch(`/api/instancias/${id}/status`)
    const data = await res.json()
    if (res.ok) {
      setInstancias((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: data.conectado ? 'conectado' : 'desconectado', telefone: data.telefone ?? i.telefone }
            : i
        )
      )
      if (data.conectado) {
        setQrData((prev) => ({ ...prev, [id]: null }))
        mostrarFeedback('Conectado com sucesso!')
      }
    }
    setCheckingStatus((prev) => ({ ...prev, [id]: false }))
  }

  async function desconectar(id: string) {
    if (!confirm('Desconectar este número?')) return
    await fetch(`/api/instancias/${id}/desconectar`, { method: 'POST' })
    setInstancias((prev) =>
      prev.map((i) => i.id === id ? { ...i, status: 'desconectado', telefone: null } : i)
    )
    setQrData((prev) => ({ ...prev, [id]: null }))
    mostrarFeedback('Número desconectado.')
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conexão WhatsApp</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os números conectados ao sistema.</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nova instância
        </button>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
          <CheckCircle size={15} /> {feedback}
        </div>
      )}

      {/* Form nova instância */}
      {mostrarForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Nova instância</h2>
            <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Vendas Principal"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Token da instância (UAZAPI)</label>
              <input
                type="text"
                value={novoToken}
                onChange={(e) => setNovoToken(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
            </div>
            {erro && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle size={14} /> {erro}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={criarInstancia}
                disabled={salvando || !novoNome.trim() || !novoToken.trim()}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Adicionar
              </button>
              <button onClick={() => setMostrarForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-gray-500 py-8">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : instancias.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Smartphone size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma instância configurada.</p>
          <p className="text-gray-400 text-xs mt-1">Clique em &quot;Nova instância&quot; para adicionar um número.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {instancias.map((inst) => {
            const conectado = inst.status === 'conectado'
            const qr = qrData[inst.id]
            const carregandoQr = loadingQr[inst.id]
            const verificando = checkingStatus[inst.id]

            return (
              <div key={inst.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${conectado ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Smartphone size={20} className={conectado ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{inst.nome}</p>
                      {conectado && inst.telefone ? (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                          <Wifi size={11} /> {inst.telefone}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <WifiOff size={11} /> Desconectado
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => verificarStatus(inst.id)}
                      disabled={verificando}
                      title="Verificar status"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {verificando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    </button>
                    {conectado ? (
                      <button
                        onClick={() => desconectar(inst.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <WifiOff size={13} /> Desconectar
                      </button>
                    ) : (
                      <button
                        onClick={() => gerarQR(inst.id)}
                        disabled={carregandoQr}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-lg transition-colors"
                      >
                        {carregandoQr ? <Loader2 size={13} className="animate-spin" /> : <Smartphone size={13} />}
                        {carregandoQr ? 'Gerando...' : 'Gerar QR Code'}
                      </button>
                    )}
                    <button
                      onClick={() => deletarInstancia(inst.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                {qr && !conectado && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center gap-3">
                    <p className="text-xs text-gray-500 text-center">
                      Escaneie o QR Code com o WhatsApp do número que deseja conectar.
                    </p>
                    <img
                      src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                      alt="QR Code WhatsApp"
                      className="w-52 h-52 rounded-xl border border-gray-200"
                    />
                    <button
                      onClick={() => verificarStatus(inst.id)}
                      disabled={verificando}
                      className="flex items-center gap-1.5 text-xs text-green-600 hover:underline font-medium"
                    >
                      {verificando ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Já escaneei — verificar conexão
                    </button>
                  </div>
                )}

                {carregandoQr && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <Loader2 size={16} className="animate-spin" /> Gerando QR Code...
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
