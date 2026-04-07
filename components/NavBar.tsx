'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useState } from 'react'

const NAV_LINKS = [
  { label: 'Трейд',    labelEn: 'Trade',    href: '/trade' },
  { label: 'Кабинет',  labelEn: 'Profile',  href: '/profile' },
  { label: 'Стейкинг', labelEn: 'Staking',  href: '/staking' },
  { label: 'Машины',   labelEn: 'Machines', href: '/machines' },
  { label: 'Автомат',  labelEn: 'Vending',  href: '/vending'  },
]

export default function NavBar({ lang = 'ru', onToggleLang }: { lang?: 'ru' | 'en'; onToggleLang?: () => void }) {
  const { publicKey, disconnect } = useWallet()
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await disconnect()
    router.push('/')
  }

  const addrDisplay = publicKey
    ? `${publicKey.toString().slice(0, 4)}…${publicKey.toString().slice(-4)}`
    : ''

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 5%', height: 64,
      background: 'rgba(6,10,16,0.97)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      backdropFilter: 'blur(22px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/vend-logo.png" alt="VendChain" width={36} height={36} style={{ display: 'block', objectFit: 'contain' }} />
        <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', letterSpacing: '-0.2px' }}>VendChain</span>
      </Link>

      {/* Links */}
      <div style={{ display: 'flex', gap: 28 }}>
        {NAV_LINKS.map(n => {
          const active = pathname === n.href
          const label = lang === 'ru' ? n.label : n.labelEn
          return (
            <Link key={n.href} href={n.href} style={{
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
              color: active ? '#10b981' : '#64748b',
              borderBottom: `1.5px solid ${active ? '#10b981' : 'transparent'}`,
              paddingBottom: 2, transition: 'color 0.2s',
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = '#64748b' }}
            >{label}</Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Network */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 100, padding: '4px 10px', fontSize: 11, color: '#475569',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Devnet
        </div>

        {/* Wallet address */}
        {addrDisplay && (
          <div style={{
            background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)',
            borderRadius: 8, padding: '4px 10px', fontSize: 11,
            color: '#10b981', fontWeight: 700, fontFamily: 'monospace',
          }}>
            {addrDisplay}
          </div>
        )}

        {/* Lang toggle */}
        {onToggleLang && (
          <button onClick={onToggleLang} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, padding: '4px 10px', color: '#64748b',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#10b981' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
          >{lang === 'ru' ? 'EN' : 'RU'}</button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: 8, padding: '5px 13px',
            color: '#f87171', cursor: loggingOut ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.18)' }}
        >
          {loggingOut ? (lang === 'ru' ? 'Выход...' : 'Logging out...') : (lang === 'ru' ? 'Выйти' : 'Logout')}
        </button>
      </div>
    </nav>
  )
}
