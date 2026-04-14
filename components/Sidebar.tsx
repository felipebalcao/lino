'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, MessageSquare, LogOut, Kanban, BookOpen, TrendingUp, Users, Menu, X, Filter, Send, Bell } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mensagens', label: 'Mensagens', icon: MessageSquare },
  { href: '/disparos', label: 'Disparos', icon: Send },
  { href: '/remarketing', label: 'Remarketing', icon: Bell },
  { href: '/kanban', label: 'Kanban', icon: Kanban },
  { href: '/funil', label: 'Funil', icon: Filter },
  { href: '/ads', label: 'Ads', icon: TrendingUp },
  { href: '/treinamento', label: 'Treinamento', icon: BookOpen },
  { href: '/grupos', label: 'Grupos', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function fechar() {
    setAberto(false)
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <MessageSquare size={18} className="text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">SaaSWPP</span>
        </div>
        {/* Fechar no mobile */}
        <button onClick={fechar} className="md:hidden text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={fechar}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Botão hambúrguer — só aparece em mobile */}
      <button
        onClick={() => setAberto(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-900 text-white shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Overlay escuro — mobile */}
      {aberto && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={fechar}
        />
      )}

      {/* Sidebar mobile — drawer lateral */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-gray-900 text-white transform transition-transform duration-200 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Sidebar desktop — fixa e sempre visível */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-gray-900 text-white">
        {navContent}
      </aside>
    </>
  )
}
