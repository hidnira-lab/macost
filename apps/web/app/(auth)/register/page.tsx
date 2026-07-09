'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiMutate } from '@/lib/api/client'
import { setToken } from '@/lib/auth/session'
import { isApiErrorBody } from '@/lib/api/types'
import type { RegisterResponse } from '@/lib/api/types'

export default function RegisterPage() {
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await apiMutate<RegisterResponse>(
        '/api/auth/register',
        'POST',
        { nama, email, password }
      )
      await setToken(response.access_token)
      router.push('/home')
    } catch (err: unknown) {
      if (isApiErrorBody(err)) {
        setError(err.error.message)
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
        Daftar Akun
      </h1>
      <p
        className="text-[#fcfcfc]/60 mb-8 text-sm"
        style={{ fontFamily: 'Helvetica, sans-serif' }}
      >
        Mulai kelola keuanganmu bersama Macost
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Nama */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="nama"
            className="text-[#fcfcfc]/80 text-sm"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          >
            Nama
          </label>
          <input
            id="nama"
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            placeholder="Nama lengkapmu"
            className="bg-white/10 border border-white/20 text-[#fcfcfc] placeholder-white/30 rounded-xl px-4 py-3 outline-none focus:border-[#ff8929] transition-colors"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          />
        </div>

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
            placeholder="Minimal 8 karakter"
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
          {loading ? 'Memproses...' : 'Daftar'}
        </button>
      </form>

      {/* Login link */}
      <p
        className="text-center text-[#fcfcfc]/60 text-sm mt-6"
        style={{ fontFamily: 'Helvetica, sans-serif' }}
      >
        Sudah punya akun?{' '}
        <Link
          href="/login"
          className="text-[#298dff] hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  )
}
