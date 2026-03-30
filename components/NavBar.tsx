'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useState } from 'react'

const NAV_LINKS = [
  { label: 'TRADE',    href: '/trade' },
  { label: 'PROFILE',  href: '/profile' },
  { label: 'STAKING',  href: '/staking' },
  { label: 'VENDING',  href: '/vending' },
  { label: 'MACHINES', href: '/machines' },
]

export default function NavBar() {
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
    ? `0X...${publicKey.toString().slice(-4).toUpperCase()}`
    : ''

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: 52,
      background: 'rgba(10,10,15,0.97)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo + links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 0.5,
          userSelect: 'none', cursor: 'default',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #9945FF, #14F195)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 12, color: '#000', flexShrink: 0,
          }}>V</div>
          VENDCHAIN
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {NAV_LINKS.map(n => {
            const active = pathname === n.href
            return (
              <Link key={n.label} href={n.href} style={{
                fontSize: 12, fontWeight: 700, letterSpacing: 1.2,
                textDecoration: 'none',
                color: active ? '#fff' : '#475569',
                borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                paddingBottom: 2,
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = '#475569' }}
              >{n.label}</Link>
            )
          })}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Network badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: 0.5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#14F195', display: 'inline-block', animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
          DEVNET
        </div>

        {/* Wallet address */}
        <div style={{
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 8, padding: '5px 12px', fontSize: 11,
          color: '#a5b4fc', fontWeight: 700, fontFamily: 'monospace',
        }}>
          {addrDisplay}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '5px 14px',
            color: '#f87171', cursor: loggingOut ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
          }}
        >
          <span style={{ fontSize: 13 }}>⎋</span>
          {loggingOut ? 'Выходим...' : 'Завершить сеанс'}
        </button>
      </div>
    </nav>
  )
}
