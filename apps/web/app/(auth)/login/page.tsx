'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiMutate } from '@/lib/api/client'
import { setToken } from '@/lib/auth/session'
import { isApiErrorBody } from '@/lib/api/types'
import type { LoginResponse } from '@/lib/api/types'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await apiMutate<LoginResponse>(
        '/api/auth/login',
        'POST',
        { email, password }
      )
      await setToken(response.access_token)
      router.push('/wallets')
    } catch (err: unknown) {
      if (isApiErrorBody(err)) {
        if (err.error.code === 'ACCOUNT_LOCKED') {
          setError('Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit.')
        } else {
          setError(err.error.message)
        }
      } else {
        setError('Tidak dapat terhubung ke server. Periksa koneksi internetmu dan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm px-6 py-10">
      {/* Heading */}
      <h1
        className="text-3xl font-bold text-[#fcfcfc] mb-2"
        style={{ fontFamily: "'Neulis', sans-serif" }}
      >
        Login
      </h1>
      <p
        className="text-[#fcfcfc]/60 mb-8 text-sm"
        style={{ fontFamily: 'Helvetica, sans-serif' }}
      >
        Selamat datang kembali!
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="text-[#fcfcfc]/80 text-sm"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@contoh.com"
            className="bg-white/10 border border-white/20 text-[#fcfcfc] placeholder-white/30 rounded-xl px-4 py-3 outline-none focus:border-[#ff8929] transition-colors"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-[#fcfcfc]/80 text-sm"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="bg-white/10 border border-white/20 text-[#fcfcfc] placeholder-white/30 rounded-xl px-4 py-3 outline-none focus:border-[#ff8929] transition-colors"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          />
        </div>

        {/* Error message */}
        {error && (
          <p
            className="text-red-400 text-sm"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#ff8929] hover:bg-[#f77e2d] text-[#fcfcfc] font-semibold rounded-xl px-4 py-3 mt-2 transition-colors disabled:opacity-60"
          style={{ fontFamily: 'Helvetica, sans-serif' }}
        >
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>

      {/* Register link */}
      <p
        className="text-center text-[#fcfcfc]/60 text-sm mt-6"
        style={{ fontFamily: 'Helvetica, sans-serif' }}
      >
        Belum punya akun?{' '}
        <Link
          href="/register"
          className="text-[#298dff] hover:underline"
        >
          Daftar
        </Link>
      </p>
    </div>
  )
}
