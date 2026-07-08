'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth/session'

export default function RootRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const token = await getToken()
      router.push(token ? '/home' : '/login')
    }
    init()
  }, [router])

  return (
    <div className="bg-[#fcfcfc] min-h-screen flex items-center justify-center">
      <p className="text-[rgba(30,30,30,0.65)] text-sm font-body">
        Memuat...
      </p>
    </div>
  )
}