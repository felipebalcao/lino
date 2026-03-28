import { supabase } from '@/lib/supabase'
import { MensagemWhatsapp } from '@/types'

export async function getMensagensByTelefone(telefone: string): Promise<MensagemWhatsapp[]> {
  const { data, error } = await supabase
    .from('mensagens_whatsapp')
    .select('*')
    .eq('numero_cliente', telefone)
    .order('data_criacao', { ascending: true })

  if (error) throw error
  return data ?? []
}
