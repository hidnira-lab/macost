'use client'

import { useRouter } from 'next/navigation'

interface NavItem {
  label: string
  icon: (active: boolean) => React.ReactNode
  href: string
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M9 22V12H15V22" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    href: '/home',
  },
  {
    label: 'Dashboard',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="13" y="3" width="8" height="4" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="13" y="9" width="8" height="12" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    href: '/dashboard',
  },
  {
    label: 'Goals',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="6" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="12" r="2" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    href: '/goals',
  },
  {
    label: 'AI Assistant',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    href: '/ai',
  },
  {
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke={active ? 'white' : 'rgba(30,30,30,0.45)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    href: '/profile',
  },
]

interface BottomNavProps {
  /** The label of the currently active tab — must match one of the NAV_ITEMS labels */
  activeTab: string
}

export default function BottomNav({ activeTab }: BottomNavProps) {
  const router = useRouter()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[rgba(30,30,30,0.08)] shadow-[0_-4px_12px_0_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === activeTab
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] min-h-[44px] justify-center rounded-full transition-colors ${
                isActive ? 'bg-[#298dff]' : 'bg-transparent'
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center">
                {item.icon(isActive)}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight whitespace-nowrap ${
                  isActive
                    ? 'text-white'
                    : 'text-[rgba(30,30,30,0.45)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}