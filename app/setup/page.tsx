'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'

const MASKED = '••••••••••••••••••••••'

interface ConfigForm {
  supabaseUrl: string
  supabaseAnonKey: string
  uazapiUrl: string
  uazapiToken: string
  openaiKey: string
  fbPixelId: string
  fbAccessToken: string
  fbTestEventCode: string
  fbAdsToken: string
  fbAdAccountId: string
  instanciasPermitidas: string
}

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState<ConfigForm>({
    supabaseUrl: '',
    supabaseAnonKey: '',
    uazapiUrl: '',
    uazapiToken: '',
    openaiKey: '',
    fbPixelId: '',
    fbAccessToken: '',
    fbTestEventCode: '',
    fbAdsToken: '',
    fbAdAccountId: '',
    instanciasPermitidas: '1',
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarToken, setMostrarToken] = useState(false)
  const [mostrarKey, setMostrarKey] = useState(false)
  const [mostrarOpenai, setMostrarOpenai] = useState(false)
  const [mostrarFbToken, setMostrarFbToken] = useState(false)
  const [mostrarFbAdsToken, setMostrarFbAdsToken] = useState(false)
  const [testandoFb, setTestandoFb] = useState(false)
  const [fbTesteResult, setFbTesteResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    // Carregar config atual
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setForm((prev) => ({
          ...prev,
          supabaseUrl: data.supabaseUrl || '',
          supabaseAnonKey: data.supabaseAnonKey || '',
          uazapiUrl: data.uazapiUrl || '',
          uazapiToken: data.hasUazapiToken ? MASKED : '',
          openaiKey: data.hasOpenaiKey ? MASKED : '',
          fbPixelId: data.fbPixelId || '',
          fbAccessToken: data.hasFbAccessToken ? MASKED : '',
          fbTestEventCode: data.fbTestEventCode || '',
          fbAdsToken: data.hasFbAdsToken ? MASKED : '',
          fbAdAccountId: data.fbAdAccountId || '',
          instanciasPermitidas: data.instanciasPermitidas ?? '1',
        }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleChange(field: keyof ConfigForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSucesso(false)
    setErro(null)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)
    setSalvando(true)

    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.status === 401) {
      router.replace('/setup/login')
      return
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      setErro(errData.error ? `Erro: ${errData.error}` : 'Erro ao salvar configurações.')
      setSalvando(false)
      return
    }

    setSucesso(true)
    setSalvando(false)
  }

  async function handleTestarFb() {
    setTestandoFb(true)
    setFbTesteResult(null)
    try {
      const res = await fetch('/api/facebook/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientes: [{ nome: 'Teste Lino', telefone: '11999999999' }],
          eventName: 'Lead',
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setFbTesteResult({ ok: true, msg: `Evento recebido pelo Facebook! (events_received: ${data.events_received})` })
      } else {
        setFbTesteResult({ ok: false, msg: `Erro: ${JSON.stringify(data.error ?? data)}` })
      }
    } catch (e) {
      setFbTesteResult({ ok: false, msg: e instanceof Error ? e.message : 'Erro de rede' })
    } finally {
      setTestandoFb(false)
    }
  }

  function handleIrParaApp() {
    window.location.href = '/dashboard'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-12">
      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-700 flex items-center justify-center mb-4 shadow-lg">
            <Settings size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Configurações do sistema</h1>
          <p className="text-gray-400 text-sm mt-1">Defina as integrações para este ambiente</p>
        </div>

        <form onSubmit={handleSalvar} className="space-y-6">
          {/* Supabase */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">1</span>
              Supabase
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL do projeto</label>
                <input
                  type="url"
                  required
                  value={form.supabaseUrl}
                  onChange={(e) => handleChange('supabaseUrl', e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Anon Key</label>
                <div className="relative">
                  <input
                    type={mostrarKey ? 'text' : 'password'}
                    required
                    value={form.supabaseAnonKey}
                    onChange={(e) => handleChange('supabaseAnonKey', e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setMostrarKey(!mostrarKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrarKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Supabase Dashboard → Project Settings → API</p>
              </div>
            </div>
          </div>

          {/* OpenAI */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 text-base mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">2</span>
              OpenAI <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4 ml-8">Necessário para gerar a base de conhecimento do agente</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={mostrarOpenai ? 'text' : 'password'}
                  value={form.openaiKey}
                  onChange={(e) => handleChange('openaiKey', e.target.value)}
                  onFocus={() => { if (form.openaiKey === MASKED) handleChange('openaiKey', '') }}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <button type="button" onClick={() => setMostrarOpenai(!mostrarOpenai)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {mostrarOpenai ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">platform.openai.com → API Keys</p>
            </div>
          </div>

          {/* UAZAPI */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 text-base mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">3</span>
              UAZAPI <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4 ml-8">Necessário para envio de mensagens</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL de envio</label>
                <input
                  type="url"
                  value={form.uazapiUrl}
                  onChange={(e) => handleChange('uazapiUrl', e.target.value)}
                  placeholder="https://sua-instancia.uazapi.com/send/text"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Token da instância</label>
                <div className="relative">
                  <input
                    type={mostrarToken ? 'text' : 'password'}
                    value={form.uazapiToken}
                    onChange={(e) => handleChange('uazapiToken', e.target.value)}
                    onFocus={() => { if (form.uazapiToken === MASKED) handleChange('uazapiToken', '') }}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setMostrarToken(!mostrarToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrarToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Plano / Instâncias */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 text-base mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">4</span>
              Plano — Instâncias WhatsApp
            </h2>
            <p className="text-xs text-gray-400 mb-4 ml-8">Quantidade máxima de números que podem ser conectados neste sistema</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Instâncias permitidas</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.instanciasPermitidas}
                onChange={(e) => handleChange('instanciasPermitidas', e.target.value)}
                className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 mt-1">O cliente só poderá adicionar até esta quantidade de instâncias na aba Conexão</p>
            </div>
          </div>

          {/* Facebook Conversions API */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="font-semibold text-gray-900 text-base mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">5</span>
              Facebook Conversions API <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4 ml-8">Envia eventos de conversão ao mover clientes pelo Kanban</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pixel ID</label>
                <input
                  type="text"
                  value={form.fbPixelId}
                  onChange={(e) => handleChange('fbPixelId', e.target.value)}
                  placeholder="123456789012345"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-1">Events Manager → Pixel → Configurações</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Token</label>
                <div className="relative">
                  <input
                    type={mostrarFbToken ? 'text' : 'password'}
                    value={form.fbAccessToken}
                    onChange={(e) => handleChange('fbAccessToken', e.target.value)}
                    onFocus={() => { if (form.fbAccessToken === MASKED) handleChange('fbAccessToken', '') }}
                    placeholder="EAAxxxxxxxx..."
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setMostrarFbToken(!mostrarFbToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrarFbToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Events Manager → Pixel → Configurações → API de Conversões</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Código de evento de teste <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.fbTestEventCode}
                  onChange={(e) => handleChange('fbTestEventCode', e.target.value)}
                  placeholder="TEST12345"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-1">Use durante testes para visualizar eventos no painel do Facebook</p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleTestarFb}
                  disabled={testandoFb}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-50 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed text-blue-700 rounded-lg transition-colors border border-blue-200"
                >
                  {testandoFb ? <><Loader2 size={14} className="animate-spin" /> Testando...</> : 'Testar conexão com Facebook'}
                </button>
                {fbTesteResult && (
                  <p className={`text-xs mt-2 font-medium ${fbTesteResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {fbTesteResult.ok ? '✓ ' : '✗ '}{fbTesteResult.msg}
                  </p>
                )}
              </div>

              <hr className="border-gray-100" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marketing API — Dashboard de Ads</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ID da conta de anúncios</label>
                <input
                  type="text"
                  value={form.fbAdAccountId}
                  onChange={(e) => handleChange('fbAdAccountId', e.target.value)}
                  placeholder="act_907365004373512"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-1">Gerenciador de Anúncios → URL da conta</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Token de Ads <span className="font-normal text-gray-400">(com permissão ads_read)</span></label>
                <div className="relative">
                  <input
                    type={mostrarFbAdsToken ? 'text' : 'password'}
                    value={form.fbAdsToken}
                    onChange={(e) => handleChange('fbAdsToken', e.target.value)}
                    onFocus={() => { if (form.fbAdsToken === MASKED) handleChange('fbAdsToken', '') }}
                    placeholder="EAAbi47F8h7g..."
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setMostrarFbAdsToken(!mostrarFbAdsToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrarFbAdsToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Explorador da Graph API com permissão ads_read</p>
              </div>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} />
              Configurações salvas com sucesso!
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {salvando ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : 'Salvar configurações'}
            </button>

            {sucesso && (
              <button
                type="button"
                onClick={handleIrParaApp}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Ir para o sistema →
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
