'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'

// ── Types ──────────────────────────────────────────────────────
type OrderSide = 'sell' | 'buy'
interface Order { price: string; amount: string; time: string; side: OrderSide }
interface TradeEntry { type: 'Buy' | 'Sell'; amount: string; price: string; ago: string }

// ── Deterministic candle generator ────────────────────────────
function seededRng(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296 }
}
function buildCandles(count: number, start: number, vol: number, bias: number, seed: number, lb: (i: number) => string) {
  const rng = seededRng(seed)
  let p = start
  return Array.from({ length: count }, (_, i) => {
    const o = p
    const body = (rng() - 0.5 + bias) * vol
    const c = Math.max(start * 0.75, o + body)
    const wt = vol * rng() * 0.45
    const wb = vol * rng() * 0.45
    const h = Math.max(o, c) + wt
    const l = Math.max(start * 0.6, Math.min(o, c) - wb)
    p = c
    return { label: lb(i), open: o, high: h, low: l, close: c }
  })
}

// ── Mock candle data (1D=24 × 1H, 1W=28 × 4H, 1M=30 × 1D) ───
const CANDLES = {
  '1D': buildCandles(24, 0.02298, 0.00022, 0.22, 71, i => `${i}h`),
  '1W': buildCandles(28, 0.02145, 0.00050, 0.20, 83, i => `D${i + 1}`),
  '1M': buildCandles(30, 0.01900, 0.00085, 0.20, 97, i => `${i + 1}`),
}

const PRICE = 0.02418
const SOL_BAL = 42.18
const VEND_BAL = 1402.0

// ── Candlestick SVG ────────────────────────────────────────────
function CandleChart({ period }: { period: '1D' | '1W' | '1M' }) {
  const candles = CANDLES[period]
  const W = 660, H = 280
  const pad = { t: 16, b: 28, l: 6, r: 64 }
  const allPrices = candles.flatMap(c => [c.high, c.low])
  const min = Math.min(...allPrices) * 0.9992
  const max = Math.max(...allPrices) * 1.0008
  const range = max - min
  const toY = (p: number) => pad.t + (1 - (p - min) / range) * (H - pad.t - pad.b)
  const innerW = W - pad.l - pad.r
  const colW = innerW / candles.length
  const bodyW = Math.max(2, colW * 0.6)
  // Show label every N candles so they don't overlap
  const step = candles.length <= 8 ? 1 : candles.length <= 16 ? 3 : 6

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 280 }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + t * (H - pad.t - pad.b)
        const price = max - t * range
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={W - pad.r + 4} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={W - pad.r + 8} y={y + 3} fontSize="8" fill="#334155" fontFamily="monospace">
              {price.toFixed(5)}
            </text>
          </g>
        )
      })}
      {/* Candles */}
      {candles.map((c, i) => {
        const cx = pad.l + (i + 0.5) * colW
        const isGreen = c.close >= c.open
        const color = isGreen ? '#14F195' : '#ef4444'
        const bodyTop = toY(Math.max(c.open, c.close))
        const bodyBot = toY(Math.min(c.open, c.close))
        const bodyH = Math.max(bodyBot - bodyTop, 1.5)
        return (
          <g key={i}>
            <line x1={cx} y1={toY(c.high)} x2={cx} y2={toY(c.low)} stroke={color} strokeWidth="1" />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
              fill={isGreen ? 'rgba(20,241,149,0.20)' : 'rgba(239,68,68,0.20)'}
              stroke={color} strokeWidth="0.8" rx="1" />
            {i % step === 0 && (
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="7.5" fill="#334155" fontFamily="monospace">
                {c.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Toast ──────────────────────────────────────────────────────
function Toast({ onClose }: { onClose: () => void }) {
  return (
    <div className="fade-up" style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 200,
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#0f1a16', border: '1px solid rgba(20,241,149,0.3)',
      borderRadius: 14, padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(20,241,149,0.15)', border: '1px solid #14F195',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#14F195', fontSize: 16, flexShrink: 0,
      }}>✓</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Swap Successful</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Confirmed on Devnet</div>
      </div>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: '#475569',
        cursor: 'pointer', fontSize: 18, marginLeft: 8, lineHeight: 1,
      }}>×</button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function TradePage() {
  const { connected, connecting } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<'1D' | '1W' | '1M'>('1D')
  const [solAmt, setSolAmt] = useState('1.5')
  const [vendSell, setVendSell] = useState('')
  const [orders, setOrders] = useState<Order[]>([
    { price: '0.02422', amount: '4,192.5', time: '12:40:55', side: 'sell' },
    { price: '0.02421', amount: '820.0',   time: '12:40:51', side: 'sell' },
    { price: '0.02419', amount: '1,240.0', time: '12:41:02', side: 'buy' },
    { price: '0.02418', amount: '250.0',   time: '12:41:00', side: 'buy' },
    { price: '0.02418', amount: '1,020.0', time: '12:40:59', side: 'buy' },
  ])
  const [history, setHistory] = useState<TradeEntry[]>([
    { type: 'Buy',  amount: '500.0 VEND', price: '0.02415', ago: '2m ago' },
    { type: 'Sell', amount: '120.0 VEND', price: '0.02410', ago: '1h ago' },
  ])
  const [toast, setToast] = useState(false)

  const solAmtNum = parseFloat(solAmt) || 0
  const vendReceive = solAmtNum > 0 ? (solAmtNum / PRICE).toFixed(2) : '0.00'

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted && !connecting && !connected) router.push('/')
  }, [mounted, connecting, connected, router])

  // Live order flow
  useEffect(() => {
    if (!mounted) return
    const prices = ['0.02416','0.02417','0.02418','0.02419','0.02420','0.02421','0.02422','0.02423']
    const iv = setInterval(() => {
      const now = new Date()
      const t = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
      const price = prices[Math.floor(Math.random() * prices.length)]
      const amount = (Math.random() * 2000 + 100).toFixed(1)
      const side: OrderSide = parseFloat(price) >= 0.02419 ? 'sell' : 'buy'
      setOrders(prev => [{ price, amount, time: t, side }, ...prev.slice(0, 7)])
    }, 3000)
    return () => clearInterval(iv)
  }, [mounted])

  const showToast = () => {
    setToast(true)
    setTimeout(() => setToast(false), 3500)
  }

  const handleBuy = () => {
    if (!solAmtNum) return
    setHistory(prev => [
      { type: 'Buy', amount: `${vendReceive} VEND`, price: PRICE.toFixed(5), ago: 'just now' },
      ...prev.slice(0, 9),
    ])
    setSolAmt('')
    showToast()
  }

  const handleSell = () => {
    const amt = parseFloat(vendSell)
    if (!amt) return
    setHistory(prev => [
      { type: 'Sell', amount: `${vendSell} VEND`, price: PRICE.toFixed(5), ago: 'just now' },
      ...prev.slice(0, 9),
    ])
    setVendSell('')
    showToast()
  }

  if (!mounted || connecting) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569', fontSize: 14 }}>Загрузка...</div>
    </div>
  )
  if (!connected) return null

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '12px 56px 12px 14px',
    color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none',
  }

  const sellOrders = orders.filter(o => o.side === 'sell').slice(0, 2)
  const buyOrders  = orders.filter(o => o.side === 'buy').slice(0, 3)

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '290px 1fr 290px', gap: 16 }}>

        {/* ── LEFT: EXCHANGE ── */}
        <div style={{ ...card, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5 }}>EXCHANGE</h2>

          {/* Buy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1 }}>PAY WITH SOL</span>
              <span style={{ fontSize: 10, color: '#475569' }}>Bal: {SOL_BAL}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type="number" value={solAmt} onChange={e => setSolAmt(e.target.value)}
                style={inputStyle} placeholder="0.00" />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>SOL</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8', cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
              >⇅</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1 }}>RECEIVE VEND</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input readOnly value={vendReceive}
                style={{ ...inputStyle, color: '#94a3b8', cursor: 'default' }} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#475569' }}>VEND</span>
            </div>
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 8 }}>
            {['$10', '$50', '$100'].map(v => (
              <button key={v} onClick={() => setSolAmt((parseFloat(v.slice(1)) / 140).toFixed(3))} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' }}
              >{v}</button>
            ))}
            <button style={{
              flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8',
            }}>Custom</button>
          </div>

          <button onClick={handleBuy} style={{
            width: '100%', padding: '14px', borderRadius: 10, cursor: 'pointer',
            fontSize: 14, fontWeight: 900, letterSpacing: 1.2,
            background: 'linear-gradient(135deg, #6366f1, #9945FF)',
            border: 'none', color: '#fff', transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >BUY VEND</button>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Sell */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1 }}>SELL VEND</span>
              <span style={{ fontSize: 10, color: '#475569' }}>Bal: {VEND_BAL.toLocaleString()}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type="number" value={vendSell} onChange={e => setVendSell(e.target.value)}
                style={inputStyle} placeholder="0.00" />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>VEND</span>
            </div>
          </div>

          <button onClick={handleSell} style={{
            width: '100%', padding: '13px', borderRadius: 10, cursor: 'pointer',
            fontSize: 14, fontWeight: 900, letterSpacing: 1.2,
            background: 'transparent', border: '1px solid rgba(99,102,241,0.4)',
            color: '#818cf8', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = '#6366f1' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
          >SELL VEND</button>
        </div>

        {/* ── CENTER: CHART + HISTORY ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900 }}>VEND / SOL</span>
                  <span style={{ background: 'rgba(20,241,149,0.12)', border: '1px solid rgba(20,241,149,0.3)', color: '#14F195', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 6 }}>+4.2%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#818cf8' }}>{PRICE.toFixed(5)}</span>
                  <span style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>SOL</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['1D', '1W', '1M'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: period === p ? '#4f46e5' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${period === p ? '#4f46e5' : 'rgba(255,255,255,0.08)'}`,
                    color: period === p ? '#fff' : '#64748b', transition: 'all 0.2s',
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <CandleChart period={period} />
          </div>

          {/* History */}
          <div style={{ ...card, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: '#94a3b8' }}>YOUR RECENT HISTORY</h2>
              <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, cursor: 'pointer' }}>VIEW ALL</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px', gap: 8, padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['TYPE', 'AMOUNT', 'PRICE (SOL)', 'TIME'].map(h => (
                <div key={h} style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h}</div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {history.map((tx, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px', gap: 8,
                  padding: '10px 8px', borderRadius: 8,
                  background: i === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tx.type === 'Buy' ? '#14F195' : '#ef4444' }}>{tx.type}</span>
                  <span style={{ fontSize: 13, color: '#e2e8f0' }}>{tx.amount}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>{tx.price}</span>
                  <span style={{ fontSize: 12, color: '#475569' }}>{tx.ago}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: INFO + ORDER FLOW ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 22,
          }}>
            <div style={{ fontSize: 9, color: '#818cf8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ECOSYSTEM REWARD</div>
            <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5, marginBottom: 4 }}>HOLDING YIELD</h2>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#14F195', marginBottom: 10, lineHeight: 1 }}>18.4% APY</div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
              Earn passive VEND rewards for every machine transaction globally.
            </p>
            <Link href="/staking" style={{ fontSize: 12, color: '#818cf8', fontWeight: 700, textDecoration: 'none', letterSpacing: 0.5 }}>
              GO TO STAKING →
            </Link>
          </div>

          {/* Order flow */}
          <div style={{ ...card, padding: 20, flex: 1 }}>
            <h2 style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: '#94a3b8', marginBottom: 14 }}>LIVE ORDER FLOW</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 4, padding: '0 4px 8px', marginBottom: 4 }}>
              {['PRICE', 'AMOUNT', 'TIME'].map(h => (
                <div key={h} style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h}</div>
              ))}
            </div>
            {sellOrders.map((o, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 4, padding: '7px 4px', borderRadius: 6, background: 'rgba(239,68,68,0.04)', marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'monospace', fontWeight: 600 }}>{o.price}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', textAlign: 'right' }}>{o.amount}</span>
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', textAlign: 'right' }}>{o.time}</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', fontSize: 10, color: '#475569', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '4px 0', letterSpacing: 0.5, fontFamily: 'monospace' }}>
              SPREAD: 0.00002
            </div>
            {buyOrders.map((o, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 4, padding: '7px 4px', borderRadius: 6, background: 'rgba(20,241,149,0.04)', marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: '#14F195', fontFamily: 'monospace', fontWeight: 600 }}>{o.price}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', textAlign: 'right' }}>{o.amount}</span>
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', textAlign: 'right' }}>{o.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && <Toast onClose={() => setToast(false)} />}
    </div>
  )
}
