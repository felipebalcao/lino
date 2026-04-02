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
    <div className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" fill="#D1D5DB" />
        <circle cx="12" cy="9" r="4" fill="#9CA3AF" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#9CA3AF" />
      </svg>
    </div>
  )
}
