export interface Cliente {
  id: number
  created_at: string
  nome: string
  telefone: string
  cidade: string
  foto?: string | null
  kanban_secao_id?: number | null
}

export interface MensagemWhatsapp {
  id: number
  cliente_id?: number
  mensagem: string
  quem_mandou: string
  status: string
  lote_id: string | number | null
  numero_cliente: string
  data_criacao: string
}

export interface ClienteComUltimaMensagem extends Cliente {
  ultima_mensagem?: MensagemWhatsapp | null
}

export interface KanbanSecao {
  id: number
  nome: string
  ordem: number
  created_at: string
}

export interface TreinamentoPrompt {
  id: number
  conteudo: string
  updated_at: string
}

export interface TreinamentoQA {
  id: number
  pergunta: string
  resposta: string
  created_at: string
}

export interface TreinamentoTexto {
  id: number
  titulo: string
  conteudo: string
  created_at: string
}

export interface BaseConhecimento {
  id: number
  conteudo: string
  gerado_em: string
  tokens_prompt: number | null
  tokens_resposta: number | null
  tokens_total: number | null
}
