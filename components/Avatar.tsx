'use client'

import { useState } from 'react'

interface Props {
  nome: string
  foto?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-12 h-12 text-base',
}

const COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#1E88E5', '#00897B', '#43A047', '#FB8C00',
  '#F4511E', '#6D4C41', '#546E7A', '#039BE5',
]

function getColor(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Avatar({ nome, foto, size = 'md' }: Props) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = sizeMap[size]
  const initials = nome.trim().slice(0, 2).toUpperCase()
  const bg = getColor(nome)

  if (foto && !imgError) {
    return (
      <img
        src={foto}
        alt={nome}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  )
}
