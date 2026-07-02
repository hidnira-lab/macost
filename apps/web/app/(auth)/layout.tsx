/**
 * Auth route group layout.
 * Shared full-height dark centered container for /register and /login.
 * No 'use client' — this is a server component.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#1e1e1e] min-h-screen flex items-center justify-center">
      {children}
    </div>
  )
}
