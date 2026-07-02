'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, apiMutate } from '@/lib/api/client'
import { getToken, clearToken } from '@/lib/auth/session'
import type { WalletsResponse, Wallet } from '@/lib/api/types'

export default function WalletsPage() {
  const router = useRouter()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add wallet form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  const loadWallets = useCallback(async () => {
    try {
      const data = await apiFetch<WalletsResponse>('/api/wallets')
      setWallets(data.wallets)
    } catch {
      setError('Gagal memuat daftar dompet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const token = await getToken()
      if (!token) {
        router.push('/login')
        return
      }
      await loadWallets()
    }
    init()
  }, [router, loadWallets])

  async function handleLogout() {
    await clearToken()
    router.push('/login')
  }

  async function handleAddWallet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setAddLoading(true)
    try {
      const wallet = await apiMutate<Wallet>('/api/wallets', 'POST', {
        nama_dompet: newName,
      })
      setWallets((prev) => [...prev, wallet])
      setNewName('')
      setShowAddForm(false)
    } catch {
      setError('Gagal menambah dompet')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRename(id: string) {
    setError(null)
    setRenameLoading(true)
    try {
      const updated = await apiMutate<Wallet>(`/api/wallets/${id}`, 'PUT', {
        nama_dompet: editingName,
      })
      setWallets((prev) =>
        prev.map((w) => (w.id_dompet === id ? updated : w))
      )
      setEditingId(null)
    } catch {
      setError('Gagal mengubah nama dompet')
    } finally {
      setRenameLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus dompet ini? Tindakan ini tidak dapat dibatalkan.')) return
    setError(null)
    try {
      await apiMutate<Record<string, never>>(`/api/wallets/${id}`, 'DELETE', null)
      setWallets((prev) => prev.filter((w) => w.id_dompet !== id))
    } catch {
      setError('Gagal menghapus dompet')
    }
  }

  if (loading) {
    return (
      <div className="bg-[#1e1e1e] min-h-screen flex items-center justify-center">
        <p
          className="text-[#fcfcfc]/60 text-sm"
          style={{ fontFamily: 'Helvetica, sans-serif' }}
        >
          Memuat dompet...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#1e1e1e] min-h-screen">
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-2xl font-bold text-[#fcfcfc]"
            style={{ fontFamily: "'Neulis', sans-serif" }}
          >
            Kelola Dompet
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-[#fcfcfc]/50 hover:text-[#fcfcfc] transition-colors"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          >
            Logout
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p
              className="text-red-400 text-sm"
              style={{ fontFamily: 'Helvetica, sans-serif' }}
              role="alert"
            >
              {error}
            </p>
          </div>
        )}

        {/* Wallet list */}
        <div className="flex flex-col gap-3 mb-6">
          {wallets.length === 0 && !loading && (
            <p
              className="text-[#fcfcfc]/40 text-sm text-center py-8"
              style={{ fontFamily: 'Helvetica, sans-serif' }}
            >
              Belum ada dompet. Tambahkan dompet pertamamu!
            </p>
          )}

          {wallets.map((wallet) => (
            <div
              key={wallet.id_dompet}
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4"
            >
              {editingId === wallet.id_dompet ? (
                /* Inline rename form */
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 text-[#fcfcfc] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff8929] transition-colors"
                    style={{ fontFamily: 'Helvetica, sans-serif' }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(wallet.id_dompet)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button
                    onClick={() => handleRename(wallet.id_dompet)}
                    disabled={renameLoading || !editingName.trim()}
                    className="text-[#298dff] text-sm font-medium hover:opacity-80 disabled:opacity-40 shrink-0"
                    style={{ fontFamily: 'Helvetica, sans-serif' }}
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-[#fcfcfc]/40 text-sm hover:opacity-80 shrink-0"
                    style={{ fontFamily: 'Helvetica, sans-serif' }}
                  >
                    Batal
                  </button>
                </div>
              ) : (
                /* Normal wallet display */
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className="text-[#fcfcfc] font-medium truncate"
                      style={{ fontFamily: 'Helvetica, sans-serif' }}
                    >
                      {wallet.nama_dompet}
                    </p>
                    <p
                      className="text-[#fcfcfc]/60 text-sm mt-0.5"
                      style={{ fontFamily: 'Helvetica, sans-serif' }}
                    >
                      Rp {wallet.saldo.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(wallet.id_dompet)
                        setEditingName(wallet.nama_dompet)
                      }}
                      className="text-[#298dff] text-sm hover:opacity-80 transition-opacity"
                      style={{ fontFamily: 'Helvetica, sans-serif' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(wallet.id_dompet)}
                      className="text-red-400 text-sm hover:opacity-80 transition-opacity"
                      style={{ fontFamily: 'Helvetica, sans-serif' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add wallet section */}
        {showAddForm ? (
          <form
            onSubmit={handleAddWallet}
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 flex gap-2 items-center"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Nama dompet baru"
              className="flex-1 bg-white/10 border border-white/20 text-[#fcfcfc] placeholder-white/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff8929] transition-colors"
              style={{ fontFamily: 'Helvetica, sans-serif' }}
              autoFocus
            />
            <button
              type="submit"
              disabled={addLoading || !newName.trim()}
              className="bg-[#ff8929] hover:bg-[#f77e2d] text-[#fcfcfc] text-sm font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-60 shrink-0"
              style={{ fontFamily: 'Helvetica, sans-serif' }}
            >
              {addLoading ? '...' : 'Tambah'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
              }}
              className="text-[#fcfcfc]/40 text-sm hover:opacity-80 shrink-0"
              style={{ fontFamily: 'Helvetica, sans-serif' }}
            >
              Batal
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-[#ff8929] hover:bg-[#f77e2d] text-[#fcfcfc] font-semibold rounded-xl px-4 py-3 transition-colors"
            style={{ fontFamily: 'Helvetica, sans-serif' }}
          >
            + Tambah Dompet
          </button>
        )}
      </div>
    </div>
  )
}
