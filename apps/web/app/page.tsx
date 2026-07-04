'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth/session'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const token = await getToken()
      router.push(token ? '/wallets' : '/login')
    }
    init()
  }, [router])

  return (
    <div className="bg-[#1e1e1e] min-h-screen flex items-center justify-center">
      <p
        className="text-[#fcfcfc]/60 text-sm"
        style={{ fontFamily: 'Helvetica, sans-serif' }}
      >
        Memuat...
      </p>
    </div>
  )
}
