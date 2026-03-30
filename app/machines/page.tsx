'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import NavBar from '../../components/NavBar'

type MachineStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'

interface Machine {
  id: string
  name: string
  city: string
  country: string
  status: MachineStatus
  dailyAvg: number
  today: number
  uptime: number
  mx: number
  my: number
  topProducts: { name: string; revenue: number }[]
  weekRevenue: number[]
}

const MACHINES: Machine[] = [
  {
    id: 'VC-9928', name: 'Shibuya Crossing', city: 'Tokyo', country: 'JP',
    status: 'ONLINE', dailyAvg: 1420, today: 412.50, uptime: 99.98, mx: 80, my: 36,
    topProducts: [
      { name: 'Bio-Fuel Cell (L)', revenue: 145.00 },
      { name: 'Nano-Filter Pack', revenue: 88.20 },
      { name: 'Synthetic Protein', revenue: 62.50 },
    ],
    weekRevenue: [145, 162, 178, 155, 190, 210, 195],
  },
  {
    id: 'VC-1042', name: 'Central Park', city: 'New York', country: 'US',
    status: 'MAINTENANCE', dailyAvg: 890, today: 0, uptime: 87.20, mx: 20, my: 34,
    topProducts: [
      { name: 'Energy Drink XL', revenue: 0 },
      { name: 'Protein Bar', revenue: 0 },
      { name: 'Vitamin Water', revenue: 0 },
    ],
    weekRevenue: [98, 112, 134, 120, 0, 0, 0],
  },
  {
    id: 'VC-8831', name: 'Silicon Roundabout', city: 'London', country: 'GB',
    status: 'ONLINE', dailyAvg: 2100, today: 644.10, uptime: 99.71, mx: 46, my: 27,
    topProducts: [
      { name: 'Premium Coffee', revenue: 210.00 },
      { name: 'Protein Shake', revenue: 178.50 },
      { name: 'Energy Bar', revenue: 124.00 },
    ],
    weekRevenue: [198, 210, 185, 220, 235, 208, 195],
  },
  {
    id: 'VC-2210', name: 'Marina Bay', city: 'Singapore', country: 'SG',
    status: 'ONLINE', dailyAvg: 1200, today: 212.00, uptime: 99.95, mx: 74, my: 56,
    topProducts: [
      { name: 'Coconut Water', revenue: 88.00 },
      { name: 'Green Tea', revenue: 72.00 },
      { name: 'Vitamin Pack', revenue: 52.00 },
    ],
    weekRevenue: [110, 125, 140, 135, 150, 142, 138],
  },
  {
    id: 'VC-5501', name: 'Almaty Plaza', city: 'Almaty', country: 'KZ',
    status: 'ONLINE', dailyAvg: 680, today: 198.40, uptime: 98.44, mx: 63, my: 33,
    topProducts: [
      { name: 'Shaibara Juice', revenue: 72.00 },
      { name: 'Snickers', revenue: 55.80 },
      { name: 'Lipton Ice Tea', revenue: 48.20 },
    ],
    weekRevenue: [88, 92, 78, 105, 115, 98, 102],
  },
  {
    id: 'VC-3317', name: 'DIFC Tower', city: 'Dubai', country: 'AE',
    status: 'ONLINE', dailyAvg: 1850, today: 524.20, uptime: 99.90, mx: 60, my: 41,
    topProducts: [
      { name: 'Gold Espresso', revenue: 195.00 },
      { name: 'Premium Water', revenue: 142.00 },
      { name: 'Date Snack', revenue: 88.00 },
    ],
    weekRevenue: [175, 190, 210, 198, 220, 215, 205],
  },
  {
    id: 'VC-7702', name: 'Gangnam District', city: 'Seoul', country: 'KR',
    status: 'ONLINE', dailyAvg: 1650, today: 388.75, uptime: 99.85, mx: 81, my: 33,
    topProducts: [
      { name: 'Banana Milk', revenue: 142.00 },
      { name: 'Honey Butter', revenue: 118.50 },
      { name: 'Green Tea Latte', revenue: 98.00 },
    ],
    weekRevenue: [155, 168, 175, 162, 180, 192, 188],
  },
  {
    id: 'VC-4488', name: 'Paulista Avenue', city: 'São Paulo', country: 'BR',
    status: 'OFFLINE', dailyAvg: 560, today: 0, uptime: 72.10, mx: 29, my: 62,
    topProducts: [
      { name: 'Guaraná', revenue: 0 },
      { name: 'Açaí Bar', revenue: 0 },
      { name: 'Coffee Shot', revenue: 0 },
    ],
    weekRevenue: [62, 78, 55, 0, 0, 0, 0],
  },
  {
    id: 'VC-6621', name: 'Nairobi CBD', city: 'Nairobi', country: 'KE',
    status: 'ONLINE', dailyAvg: 420, today: 118.60, uptime: 96.22, mx: 55, my: 56,
    topProducts: [
      { name: 'Tusker Water', revenue: 45.00 },
      { name: 'Energy Bar', revenue: 38.00 },
      { name: 'Juice Pack', revenue: 32.00 },
    ],
    weekRevenue: [42, 48, 52, 45, 58, 62, 55],
  },
  {
    id: 'VC-1188', name: 'South Bank', city: 'Melbourne', country: 'AU',
    status: 'ONLINE', dailyAvg: 980, today: 276.30, uptime: 99.10, mx: 83, my: 73,
    topProducts: [
      { name: 'Flat White', revenue: 112.00 },
      { name: 'Tim Tam Bar', revenue: 88.00 },
      { name: 'V Energy', revenue: 72.00 },
    ],
    weekRevenue: [92, 98, 105, 112, 108, 115, 120],
  },
  {
    id: 'VC-9001', name: 'Times Square', city: 'New York', country: 'US',
    status: 'ONLINE', dailyAvg: 2400, today: 712.80, uptime: 99.92, mx: 21, my: 33,
    topProducts: [
      { name: 'Cold Brew', revenue: 245.00 },
      { name: 'Protein Shake', revenue: 198.00 },
      { name: 'Power Bar', revenue: 155.00 },
    ],
    weekRevenue: [215, 225, 238, 220, 248, 260, 242],
  },
  {
    id: 'VC-3344', name: 'Pudong District', city: 'Shanghai', country: 'CN',
    status: 'ONLINE', dailyAvg: 1980, today: 558.40, uptime: 99.88, mx: 77, my: 37,
    topProducts: [
      { name: 'Nongfu Spring', revenue: 185.00 },
      { name: 'Oreo Pack', revenue: 148.00 },
      { name: 'Red Bull', revenue: 122.00 },
    ],
    weekRevenue: [185, 195, 210, 202, 215, 220, 218],
  },
  {
    id: 'VC-7755', name: 'La Défense', city: 'Paris', country: 'FR',
    status: 'MAINTENANCE', dailyAvg: 1340, today: 0, uptime: 91.50, mx: 48, my: 27,
    topProducts: [
      { name: 'Perrier Water', revenue: 0 },
      { name: 'Café au Lait', revenue: 0 },
      { name: 'Pain au Chocolat', revenue: 0 },
    ],
    weekRevenue: [125, 138, 142, 0, 0, 0, 0],
  },
  {
    id: 'VC-8899', name: 'Akihabara', city: 'Tokyo', country: 'JP',
    status: 'ONLINE', dailyAvg: 1120, today: 315.60, uptime: 99.65, mx: 79, my: 35,
    topProducts: [
      { name: 'Pocari Sweat', revenue: 118.00 },
      { name: 'Calpis Water', revenue: 95.00 },
      { name: 'Meiji Choc', revenue: 82.00 },
    ],
    weekRevenue: [102, 112, 118, 108, 122, 128, 115],
  },
]

const STATUS_COLOR: Record<MachineStatus, string> = {
  ONLINE: '#14F195',
  OFFLINE: '#ef4444',
  MAINTENANCE: '#f59e0b',
}

// Simplified continent SVG paths (1000×520 viewBox)
const CONTINENTS = [
  // North America
  'M 128 108 L 165 80 L 228 84 L 275 98 L 295 132 L 302 168 L 288 208 L 265 242 L 228 262 L 190 255 L 160 230 L 140 196 L 122 158 Z',
  // South America
  'M 215 270 L 270 262 L 302 282 L 315 328 L 305 388 L 275 430 L 245 420 L 215 385 L 205 328 L 212 286 Z',
  // Europe
  'M 436 120 L 460 110 L 488 112 L 514 120 L 526 142 L 518 170 L 496 184 L 466 188 L 446 174 L 436 154 L 434 134 Z',
  // Africa
  'M 443 200 L 496 190 L 526 200 L 540 240 L 536 302 L 520 365 L 496 418 L 466 420 L 440 392 L 433 334 L 436 260 L 438 220 Z',
  // Asia (main)
  'M 520 90 L 602 80 L 702 84 L 782 94 L 850 124 L 876 170 L 860 220 L 802 250 L 735 270 L 670 260 L 620 234 L 578 212 L 550 184 L 526 154 L 518 120 Z',
  // Australia
  'M 746 340 L 800 320 L 850 334 L 870 374 L 856 414 L 810 434 L 760 420 L 738 380 L 740 354 Z',
  // Greenland
  'M 306 64 L 346 60 L 374 74 L 376 110 L 350 126 L 316 123 L 296 104 L 296 80 Z',
  // Japan (island group)
  'M 840 148 L 858 143 L 864 162 L 852 170 L 841 162 Z',
  // UK
  'M 444 126 L 455 121 L 460 136 L 450 142 L 440 135 Z',
  // New Zealand (approx)
  'M 894 410 L 902 402 L 908 415 L 900 424 L 892 418 Z',
]

export default function MachinesPage() {
  const { connected, connecting } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | MachineStatus>('All')
  const [sortBy, setSortBy] = useState<'Profit' | 'Uptime' | 'ID'>('Profit')
  const [selected, setSelected] = useState<Machine | null>(null)
  const [liveRevenue, setLiveRevenue] = useState(42800)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestSubmitted, setSuggestSubmitted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && !connecting && !connected) router.push('/')
  }, [mounted, connecting, connected, router])

  useEffect(() => {
    const t = setInterval(() => {
      setLiveRevenue(prev => prev + Math.random() * 0.8)
    }, 900)
    return () => clearInterval(t)
  }, [])

  if (!mounted || connecting) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6366f1', fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>CONNECTING...</div>
      </div>
    )
  }
  if (!connected) return null

  const filtered = MACHINES
    .filter(m => {
      if (statusFilter !== 'All' && m.status !== statusFilter) return false
      const q = search.toLowerCase()
      if (q && !m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q) && !m.city.toLowerCase().includes(q)) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'Profit') return b.today - a.today
      if (sortBy === 'Uptime') return b.uptime - a.uptime
      return a.id.localeCompare(b.id)
    })

  const totalFleet = 1284
  const onlineCount = MACHINES.filter(m => m.status === 'ONLINE').length

  const maxWeekRev = selected ? Math.max(...selected.weekRevenue, 1) : 1
  const weekTotal = selected ? selected.weekRevenue.reduce((a, b) => a + b, 0) : 0
  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <NavBar />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 14, marginBottom: 20 }}>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>TOTAL FLEET</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalFleet.toLocaleString()}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>LIVE REVENUE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>${(liveRevenue / 1000).toFixed(1)}K</span>
              <span style={{ fontSize: 11, color: '#14F195', fontWeight: 600 }}>↗ +12%</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ACTIVE NOW</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>1,202</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#14F195', display: 'inline-block', flexShrink: 0, animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setSuggestOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '18px 26px', cursor: 'pointer',
                color: '#e2e8f0', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              <span style={{ fontSize: 16 }}>📍</span>
              Suggest Location
            </button>
          </div>
        </div>

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr', gap: 14 }}>

          {/* Left sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Filters */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>FILTERS</span>
                <span style={{ color: '#475569', fontSize: 16, cursor: 'pointer' }}>⊞</span>
              </div>

              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 13 }}>⌕</span>
                <input
                  placeholder="Search machine ID or City..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px 8px 28px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as 'All' | MachineStatus)}
                  style={{ padding: '7px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#94a3b8', fontSize: 11, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="All">Status: All</option>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'Profit' | 'Uptime' | 'ID')}
                  style={{ padding: '7px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#94a3b8', fontSize: 11, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Profit">Sort: Profit</option>
                  <option value="Uptime">Sort: Uptime</option>
                  <option value="ID">Sort: ID</option>
                </select>
              </div>
            </div>

            {/* Machine list */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 0.8 }}>
                  {filtered.length} ACTIVE IN VIEWPORT
                </span>
              </div>
              <div style={{ maxHeight: 490, overflowY: 'auto' }}>
                {filtered.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelected(prev => prev?.id === m.id ? null : m)}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer', transition: 'background 0.15s',
                      background: selected?.id === m.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selected?.id !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (selected?.id !== m.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700, fontFamily: 'monospace' }}>#{m.id}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: 0.4, padding: '2px 5px', borderRadius: 4,
                          background: m.status === 'ONLINE' ? 'rgba(20,241,149,0.08)' : m.status === 'MAINTENANCE' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                          color: STATUS_COLOR[m.status],
                          border: `1px solid ${m.status === 'ONLINE' ? 'rgba(20,241,149,0.18)' : m.status === 'MAINTENANCE' ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)'}`,
                        }}>
                          {m.status}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: m.today > 0 ? '#fff' : '#334155' }}>
                        ${m.today.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Daily Avg: ${m.dailyAvg.toLocaleString()}.00</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: m.today > 0 ? '#14F195' : '#ef4444' }}>
                        {m.today > 0 ? 'TODAY' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Map + Detail panel */}
          <div style={{ display: 'flex', gap: 14 }}>

            {/* Map */}
            <div style={{
              flex: 1, background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
              overflow: 'hidden', position: 'relative', minHeight: 580,
            }}>
              <svg viewBox="0 0 1000 520" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
                {/* Background */}
                <rect width="1000" height="520" fill="#0a0a0f" />

                {/* Grid lines */}
                {Array.from({ length: 9 }).map((_, i) => (
                  <line key={`h${i}`} x1="0" y1={(i + 1) * 52} x2="1000" y2={(i + 1) * 52} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
                ))}
                {Array.from({ length: 19 }).map((_, i) => (
                  <line key={`v${i}`} x1={(i + 1) * 52.6} y1="0" x2={(i + 1) * 52.6} y2="520" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
                ))}

                {/* Continents */}
                {CONTINENTS.map((d, i) => (
                  <path key={i} d={d} fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.22)" strokeWidth="1.5" strokeLinejoin="round" />
                ))}

                {/* Machine dots */}
                {MACHINES.map(m => {
                  const cx = (m.mx / 100) * 1000
                  const cy = (m.my / 100) * 520
                  const isSel = selected?.id === m.id
                  const col = STATUS_COLOR[m.status]
                  return (
                    <g key={m.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(prev => prev?.id === m.id ? null : m)}>
                      {isSel && (
                        <>
                          <circle cx={cx} cy={cy} r="18" fill="none" stroke={col} strokeWidth="1" opacity="0.3">
                            <animate attributeName="r" values="12;22;12" dur="1.8s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.3;0;0.3" dur="1.8s" repeatCount="indefinite" />
                          </circle>
                          <text x={cx + 10} y={cy - 9} fill="#fff" fontSize="9.5" fontWeight="700" fontFamily="monospace" opacity="0.9">#{m.id}</text>
                        </>
                      )}
                      <circle cx={cx} cy={cy} r={isSel ? 7 : 5} fill={col} opacity="0.85" />
                      <circle cx={cx} cy={cy} r={isSel ? 8 : 6} fill="none" stroke={col} strokeWidth="1.5" opacity="0.35" />
                    </g>
                  )
                })}
              </svg>

              {/* Legend */}
              <div style={{
                position: 'absolute', bottom: 14, left: 14,
                display: 'flex', gap: 14, background: 'rgba(0,0,0,0.65)',
                borderRadius: 8, padding: '7px 14px', backdropFilter: 'blur(8px)',
              }}>
                {(['ONLINE', 'OFFLINE', 'MAINTENANCE'] as MachineStatus[]).map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[s], display: 'inline-block' }} />
                    <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Scan btn */}
              <div style={{ position: 'absolute', bottom: 14, right: 14 }}>
                <button style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)',
                  color: '#8b5cf6', cursor: 'pointer', fontSize: 17,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>⊙</button>
              </div>
            </div>

            {/* Detail panel */}
            {selected && (
              <div style={{
                width: 310, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px',
                flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                {/* Header */}
                <div>
                  <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>ACTIVE NODE</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: 0.3 }}>#{selected.id} {selected.name.toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{selected.city}, {selected.country}</div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 17, padding: 0, lineHeight: 1 }}
                    >✕</button>
                  </div>
                </div>

                {/* Status + Uptime */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px' }}>
                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>STATUS</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[selected.status], display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[selected.status] }}>
                        {selected.status === 'ONLINE' ? 'Healthy' : selected.status === 'MAINTENANCE' ? 'In Repair' : 'Down'}
                      </span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px' }}>
                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>UPTIME</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{selected.uptime.toFixed(2)}%</div>
                  </div>
                </div>

                {/* 7-day bar chart */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 0.8 }}>7-DAY REVENUE TREND</span>
                    <span style={{ fontSize: 11, color: '#14F195', fontWeight: 700 }}>+${weekTotal.toFixed(2)} total</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 76 }}>
                    {selected.weekRevenue.map((rev, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <div style={{
                          width: '100%',
                          height: `${Math.max((rev / maxWeekRev) * 58, rev > 0 ? 4 : 0)}px`,
                          borderRadius: '3px 3px 0 0',
                          background: i === 6 ? 'rgba(99,102,241,0.7)' : 'rgba(99,102,241,0.3)',
                          transition: 'height 0.3s',
                        }} />
                        <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>{DAYS[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top products */}
                <div>
                  <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>TOP PRODUCTS</div>
                  {selected.topProducts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{i + 1}. {p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>${p.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Access terminal */}
                <button
                  onClick={() => router.push('/vending')}
                  style={{
                    width: '100%', padding: '12px', marginTop: 'auto',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)',
                    borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 1,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)' }}
                >
                  ACCESS MACHINE TERMINAL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggest Location Modal */}
      {suggestOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { setSuggestOpen(false); setSuggestSubmitted(false) }}
        >
          <div
            style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: 420 }}
            onClick={e => e.stopPropagation()}
          >
            {suggestSubmitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>✓</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Suggestion Submitted</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Our team will review your location suggestion. Thank you for helping grow the VendChain network.</div>
                <button
                  onClick={() => { setSuggestOpen(false); setSuggestSubmitted(false) }}
                  style={{ padding: '10px 28px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >Close</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Suggest a Location</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Help expand the VendChain network by suggesting a high-traffic location.</div>

                <input placeholder="Location name / address" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
                <input placeholder="City, Country" style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
                <textarea placeholder="Why is this a good location? (foot traffic, demographics…)" rows={3} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 18, boxSizing: 'border-box' }} />

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setSuggestOpen(false)}
                    style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >Cancel</button>
                  <button
                    onClick={() => setSuggestSubmitted(true)}
                    style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                  >Submit Suggestion</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        select option { background: #13131a; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 2px; }
      `}</style>
    </div>
  )
}
