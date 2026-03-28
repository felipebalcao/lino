'use client'

import { useState } from 'react'

interface Props {
  nome: string
  foto?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-12 h-12 text-sm',
}

export default function Avatar({ nome, foto, size = 'md' }: Props) {
  const [imgError, setImgError] = useState(false)
  const initials = nome.slice(0, 2).toUpperCase()
  const sizeClass = sizeMap[size]

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
      className={`${sizeClass} rounded-full bg-green-100 flex items-center justify-center font-semibold text-green-700 shrink-0`}
    >
      {initials}
    </div>
  )
}
