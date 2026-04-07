'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import NavBar from '../../components/NavBar'
import { useMachines, type MachineStatus, type Machine } from '../../hooks/useMachines'

type Lang = 'ru' | 'en'

const T = {
  ru: {
    connecting: 'ПОДКЛЮЧЕНИЕ...',
    totalFleet: 'ВСЕГО МАШИН',
    liveRevenue: 'ВЫРУЧКА LIVE',
    activeNow: 'АКТИВНО СЕЙЧАС',
    suggestBtn: 'Предложить локацию',
    filters: 'ФИЛЬТРЫ',
    searchPlaceholder: 'Поиск по ID или городу...',
    statusAll: 'Статус: Все',
    statusOnline: 'Онлайн',
    statusOffline: 'Офлайн',
    statusMaintenance: 'Обслуживание',
    sortProfit: 'Сорт: Прибыль',
    sortUptime: 'Сорт: Аптайм',
    sortId: 'Сорт: ID',
    activeViewport: 'АКТИВНО В ОБЛАСТИ',
    today: 'СЕГОДНЯ',
    offline: 'ОФЛАЙН',
    dailyAvg: 'Ср/день:',
    activeNode: 'АКТИВНЫЙ УЗЕЛ',
    status: 'СТАТУС',
    uptime: 'АПТАЙМ',
    statusHealthy: 'Работает',
    statusInRepair: 'Ремонт',
    statusDown: 'Недоступен',
    weekChart: '7-ДНЕВНАЯ ВЫРУЧКА',
    weekTotal: 'итого',
    topProducts: 'ТОП ПРОДУКТЫ',
    accessTerminal: 'ОТКРЫТЬ ТЕРМИНАЛ',
    suggestTitle: 'Предложить локацию',
    suggestSub: 'Помогите расширить сеть VendChain, предложив место с высокой проходимостью.',
    suggestPlace: 'Название / адрес',
    suggestCity: 'Город, Страна',
    suggestWhy: 'Почему это хорошая локация? (трафик, демография…)',
    suggestCancel: 'Отмена',
    suggestSubmit: 'Отправить',
    suggestDoneTitle: 'Предложение отправлено',
    suggestDoneSub: 'Наша команда рассмотрит вашу локацию. Спасибо за помощь в развитии сети VendChain.',
    suggestDoneClose: 'Закрыть',
  },
  en: {
    connecting: 'CONNECTING...',
    totalFleet: 'TOTAL FLEET',
    liveRevenue: 'LIVE REVENUE',
    activeNow: 'ACTIVE NOW',
    suggestBtn: 'Suggest Location',
    filters: 'FILTERS',
    searchPlaceholder: 'Search machine ID or City...',
    statusAll: 'Status: All',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    statusMaintenance: 'Maintenance',
    sortProfit: 'Sort: Profit',
    sortUptime: 'Sort: Uptime',
    sortId: 'Sort: ID',
    activeViewport: 'ACTIVE IN VIEWPORT',
    today: 'TODAY',
    offline: 'OFFLINE',
    dailyAvg: 'Daily Avg:',
    activeNode: 'ACTIVE NODE',
    status: 'STATUS',
    uptime: 'UPTIME',
    statusHealthy: 'Healthy',
    statusInRepair: 'In Repair',
    statusDown: 'Down',
    weekChart: '7-DAY REVENUE TREND',
    weekTotal: 'total',
    topProducts: 'TOP PRODUCTS',
    accessTerminal: 'ACCESS MACHINE TERMINAL',
    suggestTitle: 'Suggest a Location',
    suggestSub: 'Help expand the VendChain network by suggesting a high-traffic location.',
    suggestPlace: 'Location name / address',
    suggestCity: 'City, Country',
    suggestWhy: 'Why is this a good location? (foot traffic, demographics…)',
    suggestCancel: 'Cancel',
    suggestSubmit: 'Submit Suggestion',
    suggestDoneTitle: 'Suggestion Submitted',
    suggestDoneSub: 'Our team will review your location suggestion. Thank you for helping grow the VendChain network.',
    suggestDoneClose: 'Close',
  },
} as const

// Координаты на карте для каждой машины (фиксированные, не on-chain)
const MAP_POS: Record<string, { mx: number; my: number }> = {
  'VC-9928': { mx: 80, my: 36 },
  'VC-1042': { mx: 20, my: 34 },
  'VC-8831': { mx: 46, my: 27 },
  'VC-2210': { mx: 74, my: 56 },
  'VC-5501': { mx: 63, my: 33 },
  'VC-3317': { mx: 60, my: 41 },
}

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
  const { machines, loading: machinesLoading } = useMachines()
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<Lang>('ru')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | MachineStatus>('All')
  const [sortBy, setSortBy] = useState<'Profit' | 'Uptime' | 'ID'>('Profit')
  const [selected, setSelected] = useState<Machine | null>(null)
  const [liveRevenue, setLiveRevenue] = useState(42800)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestSubmitted, setSuggestSubmitted] = useState(false)

  const c = T[lang]

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
        <div style={{ color: '#6366f1', fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>{c.connecting}</div>
      </div>
    )
  }
  if (!connected) return null

  const filtered = machines
    .filter(m => {
      if (statusFilter !== 'All' && m.status !== statusFilter) return false
      const q = search.toLowerCase()
      if (q && !m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q) && !m.location.toLowerCase().includes(q)) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'Profit') return b.today - a.today
      if (sortBy === 'Uptime') return b.uptime - a.uptime
      return a.id.localeCompare(b.id)
    })

  const totalFleet = machinesLoading ? '...' : machines.length
  const DAYS = lang === 'ru'
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const maxWeekRev = selected ? Math.max(...selected.weekRevenue, 1) : 1
  const weekTotal = selected ? selected.weekRevenue.reduce((a, b) => a + b, 0) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
      <NavBar lang={lang} onToggleLang={() => setLang(l => l === 'ru' ? 'en' : 'ru')} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 14, marginBottom: 20 }}>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '3px solid #6366f1', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{c.totalFleet}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalFleet}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{c.liveRevenue}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>${(liveRevenue / 1000).toFixed(1)}K</span>
              <span style={{ fontSize: 11, color: '#14F195', fontWeight: 600 }}>↗ +12%</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{c.activeNow}</div>
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
              {c.suggestBtn}
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
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>{c.filters}</span>
                <span style={{ color: '#475569', fontSize: 16, cursor: 'pointer' }}>⊞</span>
              </div>

              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 13 }}>⌕</span>
                <input
                  placeholder={c.searchPlaceholder}
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
                  <option value="All">{c.statusAll}</option>
                  <option value="ONLINE">{c.statusOnline}</option>
                  <option value="OFFLINE">{c.statusOffline}</option>
                  <option value="MAINTENANCE">{c.statusMaintenance}</option>
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'Profit' | 'Uptime' | 'ID')}
                  style={{ padding: '7px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#94a3b8', fontSize: 11, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Profit">{c.sortProfit}</option>
                  <option value="Uptime">{c.sortUptime}</option>
                  <option value="ID">{c.sortId}</option>
                </select>
              </div>
            </div>

            {/* Machine list */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 0.8 }}>
                  {filtered.length} {c.activeViewport}
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
                          {m.status === 'ONLINE' ? c.statusOnline : m.status === 'MAINTENANCE' ? c.statusMaintenance : c.statusOffline}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: m.today > 0 ? '#fff' : '#334155' }}>
                        ${m.today.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{c.dailyAvg} ${m.dailyAvg.toLocaleString()}.00</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: m.today > 0 ? '#14F195' : '#ef4444' }}>
                        {m.today > 0 ? c.today : c.offline}
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
                {machines.map(m => {
                  const pos = MAP_POS[m.id] ?? { mx: 50, my: 50 }
                  const cx = (pos.mx / 100) * 1000
                  const cy = (pos.my / 100) * 520
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
                    <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>
                      {s === 'ONLINE' ? c.statusOnline : s === 'MAINTENANCE' ? c.statusMaintenance : c.statusOffline}
                    </span>
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
                  <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>{c.activeNode}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: 0.3 }}>#{selected.id} {selected.name.toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{selected.location}</div>
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
                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>{c.status}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[selected.status], display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[selected.status] }}>
                        {selected.status === 'ONLINE' ? c.statusHealthy : selected.status === 'MAINTENANCE' ? c.statusInRepair : c.statusDown}
                      </span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '11px 13px' }}>
                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>{c.uptime}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{selected.uptime.toFixed(2)}%</div>
                  </div>
                </div>

                {/* 7-day bar chart */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 0.8 }}>{c.weekChart}</span>
                    <span style={{ fontSize: 11, color: '#14F195', fontWeight: 700 }}>+${weekTotal.toFixed(2)} {c.weekTotal}</span>
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
                  <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>{c.topProducts}</div>
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
                  {c.accessTerminal}
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
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{c.suggestDoneTitle}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>{c.suggestDoneSub}</div>
                <button
                  onClick={() => { setSuggestOpen(false); setSuggestSubmitted(false) }}
                  style={{ padding: '10px 28px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >{c.suggestDoneClose}</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{c.suggestTitle}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>{c.suggestSub}</div>

                <input placeholder={c.suggestPlace} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
                <input placeholder={c.suggestCity} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
                <textarea placeholder={c.suggestWhy} rows={3} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 18, boxSizing: 'border-box' }} />

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setSuggestOpen(false)}
                    style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >{c.suggestCancel}</button>
                  <button
                    onClick={() => setSuggestSubmitted(true)}
                    style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                  >{c.suggestSubmit}</button>
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
