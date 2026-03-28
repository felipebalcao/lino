import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ConfigProvider from '@/components/ConfigProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaaSWPP',
  description: 'Sistema de mensagens WhatsApp Business',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <ConfigProvider>{children}</ConfigProvider>
      </body>
    </html>
  )
}
