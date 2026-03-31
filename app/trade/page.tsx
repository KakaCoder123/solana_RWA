'use client'

import Link from 'next/link'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import NavBar from '@/components/NavBar'
import { useSale } from '@/hooks/useSale'
import { VEND_MINT, SALE_PRICE_LAMPORTS, VEND_LAMPORTS } from '@/lib/anchor'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

// ── Types ──────────────────────────────────────────────────────
type OrderSide = 'sell' | 'buy'
interface Order { price: string; amount: string; time: string; side: OrderSide }

// ── Candle chart (deterministic mock) ─────────────────────────
function seededRng(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296 }
}
function buildCandles(count: number, start: number, vol: number, bias: number, seed: number, lb: (i: number) => string) {
  const rng = seededRng(seed); let p = start
  return Array.from({ length: count }, (_, i) => {
    const o = p, body = (rng() - 0.5 + bias) * vol, c = Math.max(start * 0.75, o + body)
    const h = Math.max(o, c) + vol * rng() * 0.45
    const l = Math.max(start * 0.6, Math.min(o, c) - vol * rng() * 0.45)
    p = c; return { label: lb(i), open: o, high: h, low: l, close: c }
  })
}
const CANDLES = {
  '1D': buildCandles(24, 0.02298, 0.00022, 0.22, 71, i => `${i}h`),
  '1W': buildCandles(28, 0.02145, 0.00050, 0.20, 83, i => `D${i + 1}`),
  '1M': buildCandles(30, 0.01900, 0.00085, 0.20, 97, i => `${i + 1}`),
}
function CandleChart({ period }: { period: '1D' | '1W' | '1M' }) {
  const candles = CANDLES[period], W = 660, H = 280, pad = { t: 16, b: 28, l: 6, r: 64 }
  const prices = candles.flatMap(c => [c.high, c.low])
  const min = Math.min(...prices) * 0.9992, max = Math.max(...prices) * 1.0008, range = max - min
  const toY = (p: number) => pad.t + (1 - (p - min) / range) * (H - pad.t - pad.b)
  const colW = (W - pad.l - pad.r) / candles.length, bodyW = Math.max(2, colW * 0.6)
  const step = candles.length <= 8 ? 1 : candles.length <= 16 ? 3 : 6
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 280 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + t * (H - pad.t - pad.b)
        return <g key={t}>
          <line x1={pad.l} y1={y} x2={W - pad.r + 4} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={W - pad.r + 8} y={y + 3} fontSize="8" fill="#334155" fontFamily="monospace">{(max - t * range).toFixed(5)}</text>
        </g>
      })}
      {candles.map((c, i) => {
        const cx = pad.l + (i + 0.5) * colW, isGreen = c.close >= c.open
        const color = isGreen ? '#14F195' : '#ef4444'
        const bodyTop = toY(Math.max(c.open, c.close)), bodyH = Math.max(toY(Math.min(c.open, c.close)) - bodyTop, 1.5)
        return <g key={i}>
          <line x1={cx} y1={toY(c.high)} x2={cx} y2={toY(c.low)} stroke={color} strokeWidth="1" />
          <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
            fill={isGreen ? 'rgba(20,241,149,0.20)' : 'rgba(239,68,68,0.20)'} stroke={color} strokeWidth="0.8" rx="1" />
          {i % step === 0 && <text x={cx} y={H - 8} textAnchor="middle" fontSize="7.5" fill="#334155" fontFamily="monospace">{c.label}</text>}
        </g>
      })}
    </svg>
  )
}

// ── Toast ──────────────────────────────────────────────────────
function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 200,
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#0f1a16', border: `1px solid ${ok ? 'rgba(20,241,149,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: 14, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: ok ? 'rgba(20,241,149,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${ok ? '#14F195' : '#ef4444'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: ok ? '#14F195' : '#ef4444', fontSize: 16,
      }}>{ok ? '✓' : '✕'}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{ok ? 'Transaction Confirmed' : 'Transaction Failed'}</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{msg}</div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, marginLeft: 8 }}>×</button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function TradePage() {
  const { connected, connecting, publicKey } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const { pool, history, loading: saleLoading, buyTokens, sellTokens } = useSale()

  const [mounted, setMounted]     = useState(false)
  const [period, setPeriod]       = useState<'1D' | '1W' | '1M'>('1D')
  const [solAmt, setSolAmt]       = useState('1.5')
  const [vendSell, setVendSell]   = useState('')
  const [solBalance, setSolBal]   = useState<number | null>(null)
  const [vendBalance, setVendBal] = useState<number | null>(null)
  const [orders, setOrders]       = useState<Order[]>([
    { price: '0.02422', amount: '4,192.5', time: '12:40:55', side: 'sell' },
    { price: '0.02421', amount: '820.0',   time: '12:40:51', side: 'sell' },
    { price: '0.02419', amount: '1,240.0', time: '12:41:02', side: 'buy'  },
    { price: '0.02418', amount: '250.0',   time: '12:41:00', side: 'buy'  },
    { price: '0.02418', amount: '1,020.0', time: '12:40:59', side: 'buy'  },
  ])
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null)
  const [buying,  setBuying]  = useState(false)
  const [selling, setSelling] = useState(false)

  // Fallback: use on-chain constant so price is always correct even before pool loads
  const FALLBACK_PRICE = (SALE_PRICE_LAMPORTS * VEND_LAMPORTS) / 1e9
  const price       = pool?.pricePerVend ?? FALLBACK_PRICE
  const solAmtNum   = parseFloat(solAmt) || 0
  const vendReceive = solAmtNum > 0 ? (solAmtNum / price).toFixed(2) : '0.00'
  const solReceive  = parseFloat(vendSell) > 0 ? (parseFloat(vendSell) * price).toFixed(4) : '0.0000'

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (mounted && !connecting && !connected) router.push('/') }, [mounted, connecting, connected, router])

  const fetchBalances = useCallback(async () => {
    if (!publicKey) return
    try {
      const sol = await connection.getBalance(publicKey)
      setSolBal(sol / LAMPORTS_PER_SOL)
    } catch { /* ignore */ }
    try {
      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
      const ata = getAssociatedTokenAddressSync(VEND_MINT, publicKey)
      const info = await connection.getTokenAccountBalance(ata)
      setVendBal(parseFloat(info.value.uiAmountString ?? '0'))
    } catch { setVendBal(0) }
  }, [publicKey, connection])

  useEffect(() => { if (mounted) fetchBalances() }, [mounted, fetchBalances])

  // Live mock order flow
  useEffect(() => {
    if (!mounted) return
    const prices = ['0.02416','0.02417','0.02418','0.02419','0.02420','0.02421','0.02422','0.02423']
    const iv = setInterval(() => {
      const now = new Date()
      const t = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
      const p = prices[Math.floor(Math.random() * prices.length)]
      const side: OrderSide = parseFloat(p) >= 0.02419 ? 'sell' : 'buy'
      setOrders(prev => [{ price: p, amount: (Math.random() * 2000 + 100).toFixed(1), time: t, side }, ...prev.slice(0, 7)])
    }, 3000)
    return () => clearInterval(iv)
  }, [mounted])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const handleBuy = async () => {
    if (!solAmtNum || buying) return
    const vendAmt = parseFloat(vendReceive)
    if (!vendAmt) return
    setBuying(true)
    try {
      await buyTokens(vendAmt)
      await fetchBalances()
      showToast(`Bought ${vendReceive} VEND for ${solAmt} SOL`, true)
      setSolAmt('')
    } catch (e: any) {
      showToast(e?.message?.slice(0, 80) ?? 'Transaction failed', false)
    } finally { setBuying(false) }
  }

  const handleSell = async () => {
    const amt = parseFloat(vendSell)
    if (!amt || selling) return
    setSelling(true)
    try {
      await sellTokens(amt)
      await fetchBalances()
      showToast(`Sold ${vendSell} VEND for ${solReceive} SOL`, true)
      setVendSell('')
    } catch (e: any) {
      showToast(e?.message?.slice(0, 80) ?? 'Transaction failed', false)
    } finally { setSelling(false) }
  }

  if (!mounted || connecting) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569', fontSize: 14 }}>Загрузка...</div>
    </div>
  )
  if (!connected) return null

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '12px 56px 12px 14px', color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none',
  }
  const sellOrders = orders.filter(o => o.side === 'sell').slice(0, 2)
  const buyOrders  = orders.filter(o => o.side === 'buy').slice(0, 3)

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <NavBar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '290px 1fr 290px', gap: 16 }}>

        {/* ── LEFT: EXCHANGE ── */}
        <div style={{ ...card, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5 }}>EXCHANGE</h2>
            {pool && <span style={{ fontSize: 10, color: pool.isActive ? '#14F195' : '#ef4444', fontWeight: 700 }}>{pool.isActive ? '● LIVE' : '● PAUSED'}</span>}
          </div>

          {/* BUY section */}
          <div style={{ background: 'rgba(20,241,149,0.04)', border: '1px solid rgba(20,241,149,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, color: '#14F195', fontWeight: 700, letterSpacing: 1.5 }}>BUY VEND</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>PAY SOL</span>
              <span style={{ fontSize: 10, color: '#475569' }}>Bal: {solBalance !== null ? solBalance.toFixed(3) : '...'} SOL</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type="number" value={solAmt} onChange={e => setSolAmt(e.target.value)} style={inputStyle} placeholder="0.00" />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>SOL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>RECEIVE</span>
              <span style={{ fontSize: 10, color: '#475569' }}>{price.toFixed(4)} SOL/VEND</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input readOnly value={vendReceive} style={{ ...inputStyle, color: '#14F195', cursor: 'default', fontSize: 18 }} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#14F195' }}>VEND</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0.1, 0.5, 1.0].map(v => (
                <button key={v} onClick={() => setSolAmt(v.toString())} style={{
                  flex: 1, padding: '5px 0', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: 'rgba(20,241,149,0.07)', border: '1px solid rgba(20,241,149,0.15)', color: '#14F195',
                }}>{v}</button>
              ))}
            </div>
            <button onClick={handleBuy} disabled={buying || !solAmtNum} style={{
              width: '100%', padding: '13px', borderRadius: 10, cursor: (buying || !solAmtNum) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 900, letterSpacing: 1.2,
              background: buying ? 'rgba(20,241,149,0.2)' : 'linear-gradient(135deg, #14F195, #0ea572)',
              border: 'none', color: '#0a0a0f', opacity: !solAmtNum ? 0.5 : 1,
            }}>
              {buying ? 'SIGNING...' : '▲ BUY VEND'}
            </button>
          </div>

          {/* SELL section */}
          <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, letterSpacing: 1.5 }}>SELL VEND</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>PAY VEND</span>
              <span style={{ fontSize: 10, color: '#475569' }}>Bal: {vendBalance !== null ? vendBalance.toLocaleString() : '...'} VEND</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type="number" value={vendSell} onChange={e => setVendSell(e.target.value)} style={inputStyle} placeholder="0.00" />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>VEND</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>RECEIVE</span>
              <span style={{ fontSize: 10, color: '#475569' }}>vault: {pool ? pool.vaultBalance.toFixed(3) : '...'} SOL</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input readOnly value={solReceive} style={{ ...inputStyle, color: '#f87171', cursor: 'default', fontSize: 18 }} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>SOL</span>
            </div>
            {pool && pool.vaultBalance < (parseFloat(vendSell) || 0) * price && parseFloat(vendSell) > 0 && (
              <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center' }}>⚠ Insufficient vault liquidity</div>
            )}
            <button onClick={handleSell} disabled={selling || !parseFloat(vendSell)} style={{
              width: '100%', padding: '13px', borderRadius: 10,
              cursor: (selling || !parseFloat(vendSell)) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 900, letterSpacing: 1.2,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.5)',
              color: '#ef4444', opacity: !parseFloat(vendSell) ? 0.5 : 1,
            }}>
              {selling ? 'SIGNING...' : '▼ SELL VEND'}
            </button>
          </div>
        </div>

        {/* ── CENTER: CHART + HISTORY ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900 }}>VEND / SOL</span>
                  <span style={{ background: 'rgba(20,241,149,0.12)', border: '1px solid rgba(20,241,149,0.3)', color: '#14F195', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>DEVNET</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#818cf8' }}>{price.toFixed(5)}</span>
                  <span style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>SOL</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['1D', '1W', '1M'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: period === p ? '#4f46e5' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${period === p ? '#4f46e5' : 'rgba(255,255,255,0.08)'}`,
                    color: period === p ? '#fff' : '#64748b',
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <CandleChart period={period} />
            {pool && (
              <div style={{ display: 'flex', gap: 24, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { label: 'TOTAL SOLD',  value: `${pool.totalSold.toFixed(0)} VEND` },
                  { label: 'BUYBACKS',    value: `${pool.totalBoughtBack.toFixed(0)} VEND` },
                  { label: 'VAULT',       value: `${pool.vaultBalance.toFixed(3)} SOL` },
                  { label: 'PRICE',       value: `${price.toFixed(4)} SOL`, color: '#14F195' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: color ?? '#e2e8f0', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── TRADE HISTORY (on-chain) ── */}
          <div style={{ ...card, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: '#94a3b8' }}>ON-CHAIN TRADE HISTORY</h2>
              {saleLoading && <span style={{ fontSize: 11, color: '#475569' }}>updating...</span>}
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#334155', fontSize: 13, padding: '24px 0' }}>
                No trades yet on this program
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '50px 90px 90px 80px 1fr', gap: 8, padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['TYPE', 'AMOUNT', 'SOL', 'WALLET', 'TIME'].map(h => (
                    <div key={h} style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {history.map((tx, i) => (
                    <a key={i} href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noreferrer"
                      style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '50px 90px 90px 80px 1fr', gap: 8,
                        padding: '9px 8px', borderRadius: 8, alignItems: 'center',
                        background: i === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        transition: 'background 0.15s', cursor: 'pointer',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(255,255,255,0.02)' : 'transparent')}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'Buy' ? '#14F195' : '#ef4444' }}>{tx.type}</span>
                        <span style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace' }}>{tx.amount.toFixed(1)} VEND</span>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{tx.solAmount.toFixed(4)}</span>
                        <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{tx.wallet}</span>
                        <span style={{ fontSize: 11, color: '#334155' }}>{tx.ago}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: INFO + ORDER FLOW ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 22 }}>
            <div style={{ fontSize: 9, color: '#818cf8', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ECOSYSTEM REWARD</div>
            <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5, marginBottom: 4 }}>HOLDING YIELD</h2>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#14F195', marginBottom: 10, lineHeight: 1 }}>10% APY</div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
              Stake VEND and earn passive rewards from every machine transaction globally.
            </p>
            <Link href="/staking" style={{ fontSize: 12, color: '#818cf8', fontWeight: 700, textDecoration: 'none' }}>GO TO STAKING →</Link>
          </div>

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
            <div style={{ textAlign: 'center', fontSize: 10, color: '#475569', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '4px 0', letterSpacing: 0.5, fontFamily: 'monospace' }}>SPREAD: 0.00002</div>
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
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
    </div>
  )
}
