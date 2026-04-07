'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import { useSale } from '@/hooks/useSale'
import { useWalletData } from '@/hooks/useWalletData'
import { VEND_MINT, SALE_PRICE_LAMPORTS, VEND_LAMPORTS } from '@/lib/anchor'

type Lang = 'ru' | 'en'
type OrderSide = 'sell' | 'buy'
interface Order { price: string; amount: string; time: string; side: OrderSide }

// ── Translations ──────────────────────────────────────────────────────
const T = {
  ru: {
    loading: 'Загрузка...',
    exchange: 'Обмен', live: 'АКТИВЕН', paused: 'ПАУЗА',
    buy: 'Купить VEND', sell: 'Продать VEND',
    paySol: 'Платить SOL', payVend: 'Платить VEND',
    receive: 'Получить',
    bal: 'Баланс', vault: 'Резерв',
    buyBtn: '▲ Купить VEND', sellBtn: '▼ Продать VEND',
    signing: 'Подписание...',
    lowLiquidity: '⚠ Недостаточно ликвидности в резерве',
    chart: 'График VEND / SOL',
    totalSold: 'Продано', buybacks: 'Выкуплено', vaultLbl: 'Резерв', priceLbl: 'Цена',
    historyTitle: 'История сделок', updating: 'обновление...',
    noTrades: 'Сделок пока нет',
    histCols: ['Тип', 'Кол-во', 'SOL', 'Кошелёк', 'Время'],
    typeBuy: 'Покупка', typeSell: 'Продажа',
    ecoTag: 'Награда экосистемы', ecoTitle: 'Доход от холдинга',
    ecoDesc: 'Стейкайте VEND и зарабатывайте пассивный доход с каждой транзакции сети автоматов.',
    goStaking: 'Перейти к стейкингу →',
    orderFlow: 'Поток ордеров', spread: 'СПРЕД',
    toastOk: 'Транзакция подтверждена', toastFail: 'Транзакция отклонена',
  },
  en: {
    loading: 'Loading...',
    exchange: 'Exchange', live: 'LIVE', paused: 'PAUSED',
    buy: 'Buy VEND', sell: 'Sell VEND',
    paySol: 'Pay SOL', payVend: 'Pay VEND',
    receive: 'Receive',
    bal: 'Balance', vault: 'Vault',
    buyBtn: '▲ Buy VEND', sellBtn: '▼ Sell VEND',
    signing: 'Signing...',
    lowLiquidity: '⚠ Insufficient vault liquidity',
    chart: 'VEND / SOL Chart',
    totalSold: 'Total sold', buybacks: 'Buybacks', vaultLbl: 'Vault', priceLbl: 'Price',
    historyTitle: 'On-chain trade history', updating: 'updating...',
    noTrades: 'No trades yet on this program',
    histCols: ['Type', 'Amount', 'SOL', 'Wallet', 'Time'],
    typeBuy: 'Buy', typeSell: 'Sell',
    ecoTag: 'Ecosystem reward', ecoTitle: 'Holding yield',
    ecoDesc: 'Stake VEND and earn passive rewards from every machine transaction globally.',
    goStaking: 'Go to staking →',
    orderFlow: 'Live order flow', spread: 'SPREAD',
    toastOk: 'Transaction confirmed', toastFail: 'Transaction failed',
  },
} as const

// ── Candle chart ──────────────────────────────────────────────────────
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
  const candles = CANDLES[period], W = 660, H = 260, pad = { t: 14, b: 26, l: 6, r: 64 }
  const prices = candles.flatMap(c => [c.high, c.low])
  const min = Math.min(...prices) * 0.9992, max = Math.max(...prices) * 1.0008, range = max - min
  const toY = (p: number) => pad.t + (1 - (p - min) / range) * (H - pad.t - pad.b)
  const colW = (W - pad.l - pad.r) / candles.length, bodyW = Math.max(2, colW * 0.6)
  const step = candles.length <= 8 ? 1 : candles.length <= 16 ? 3 : 6
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 260 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + t * (H - pad.t - pad.b)
        return <g key={t}>
          <line x1={pad.l} y1={y} x2={W - pad.r + 4} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={W - pad.r + 8} y={y + 3} fontSize="8" fill="#334155" fontFamily="monospace">{(max - t * range).toFixed(5)}</text>
        </g>
      })}
      {candles.map((c, i) => {
        const cx = pad.l + (i + 0.5) * colW, isGreen = c.close >= c.open
        const color = isGreen ? '#10b981' : '#ef4444'
        const bodyTop = toY(Math.max(c.open, c.close)), bodyH = Math.max(toY(Math.min(c.open, c.close)) - bodyTop, 1.5)
        return <g key={i}>
          <line x1={cx} y1={toY(c.high)} x2={cx} y2={toY(c.low)} stroke={color} strokeWidth="1" />
          <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
            fill={isGreen ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'} stroke={color} strokeWidth="0.8" rx="1" />
          {i % step === 0 && <text x={cx} y={H - 7} textAnchor="middle" fontSize="7.5" fill="#334155" fontFamily="monospace">{c.label}</text>}
        </g>
      })}
    </svg>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────
function Toast({ msg, ok, title, onClose }: { msg: string; ok: boolean; title: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 200, display: 'flex', alignItems: 'center', gap: 12, background: '#0a1812', border: `1px solid ${ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`, borderRadius: 14, padding: '14px 18px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${ok ? '#10b981' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ok ? '#10b981' : '#ef4444', fontSize: 16 }}>{ok ? '✓' : '✕'}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{msg}</div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, marginLeft: 8 }}>×</button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function TradePage() {
  const { connected, connecting } = useWallet()
  const router = useRouter()
  const { pool, history, loading: saleLoading, buyTokens, sellTokens } = useSale()
  const { assets, refresh: refreshBalances } = useWalletData(VEND_MINT)

  const [mounted,  setMounted]  = useState(false)
  const [lang,     setLang]     = useState<Lang>('ru')
  const [period,   setPeriod]   = useState<'1D' | '1W' | '1M'>('1D')
  const [solAmt,   setSolAmt]   = useState('1.5')
  const [vendSell, setVendSell] = useState('')
  const [orders,   setOrders]   = useState<Order[]>([
    { price: '0.02422', amount: '4,192.5', time: '12:40:55', side: 'sell' },
    { price: '0.02421', amount: '820.0',   time: '12:40:51', side: 'sell' },
    { price: '0.02419', amount: '1,240.0', time: '12:41:02', side: 'buy'  },
    { price: '0.02418', amount: '250.0',   time: '12:41:00', side: 'buy'  },
    { price: '0.02418', amount: '1,020.0', time: '12:40:59', side: 'buy'  },
  ])
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [buying,   setBuying]   = useState(false)
  const [selling,  setSelling]  = useState(false)

  const solBalance  = assets.solBalance
  const vendBalance = assets.vendBalance
  const FALLBACK_PRICE = (SALE_PRICE_LAMPORTS * VEND_LAMPORTS) / 1e9
  const price      = pool?.pricePerVend ?? FALLBACK_PRICE
  const solAmtNum  = parseFloat(solAmt) || 0
  const vendReceive = solAmtNum > 0 ? (solAmtNum / price).toFixed(2) : '0.00'
  const solReceive  = parseFloat(vendSell) > 0 ? (parseFloat(vendSell) * price).toFixed(4) : '0.0000'

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (mounted && !connecting && !connected) router.push('/') }, [mounted, connecting, connected, router])

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

  const c = T[lang]
  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000) }

  const handleBuy = async () => {
    if (!solAmtNum || buying) return
    const vendAmt = parseFloat(vendReceive)
    if (!vendAmt) return
    setBuying(true)
    try {
      const sig = await buyTokens(vendAmt)
      await new Promise(r => setTimeout(r, 4000))
      await refreshBalances()
      showToast(`${vendReceive} VEND — tx: ${sig.slice(0, 8)}...`, true)
      setSolAmt('')
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToast(err?.message?.slice(0, 100) ?? 'Transaction failed', false)
    } finally { setBuying(false) }
  }

  const handleSell = async () => {
    const amt = parseFloat(vendSell)
    if (!amt || selling) return
    setSelling(true)
    try {
      const sig = await sellTokens(amt)
      await new Promise(r => setTimeout(r, 2000))
      await refreshBalances()
      showToast(`${vendSell} VEND — tx: ${sig.slice(0, 8)}...`, true)
      setVendSell('')
    } catch (e: unknown) {
      const err = e as { message?: string }
      showToast(err?.message?.slice(0, 100) ?? 'Transaction failed', false)
    } finally { setSelling(false) }
  }

  if (!mounted || connecting) return (
    <div style={{ background: '#080c12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#475569', fontSize: 13 }}>{T[lang].loading}</span>
    </div>
  )
  if (!connected) return null

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10, padding: '11px 52px 11px 14px', color: '#f1f5f9', fontSize: 19, fontWeight: 700, outline: 'none',
  }
  const sellOrders = orders.filter(o => o.side === 'sell').slice(0, 2)
  const buyOrders  = orders.filter(o => o.side === 'buy').slice(0, 3)

  return (
    <div style={{ background: '#080c12', minHeight: '100vh', color: '#f1f5f9' }}>
      <NavBar lang={lang} onToggleLang={() => setLang(l => l === 'ru' ? 'en' : 'ru')} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 5%', display: 'grid', gridTemplateColumns: '280px 1fr 270px', gap: 14 }}>

        {/* ── LEFT: EXCHANGE ── */}
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{c.exchange}</span>
            {pool && <span style={{ fontSize: 10, color: pool.isActive ? '#10b981' : '#ef4444', fontWeight: 700, letterSpacing: 0.5 }}>● {pool.isActive ? c.live : c.paused}</span>}
          </div>

          {/* BUY */}
          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, letterSpacing: 1 }}>{c.buy.toUpperCase()}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#475569' }}>{c.paySol}</span>
              <span style={{ fontSize: 10, color: '#334155' }}>{c.bal}: {solBalance !== null ? solBalance.toFixed(3) : '...'} SOL</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type="number" value={solAmt} onChange={e => setSolAmt(e.target.value)} style={inputStyle} placeholder="0.00" />
              <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: '#64748b' }}>SOL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#475569' }}>{c.receive}</span>
              <span style={{ fontSize: 10, color: '#334155' }}>{price.toFixed(4)} SOL/VEND</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input readOnly value={vendReceive} style={{ ...inputStyle, color: '#10b981', cursor: 'default', fontSize: 17 }} />
              <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: '#10b981' }}>VEND</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0.1, 0.5, 1.0].map(v => (
                <button key={v} onClick={() => setSolAmt(v.toString())} style={{ flex: 1, padding: '4px 0', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.16)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.08)' }}
                >{v}</button>
              ))}
            </div>
            <button onClick={handleBuy} disabled={buying || !solAmtNum}
              style={{ width: '100%', padding: '12px', borderRadius: 10, cursor: (buying || !solAmtNum) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 800, background: (buying || !solAmtNum) ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: '#fff', opacity: !solAmtNum ? 0.5 : 1, boxShadow: solAmtNum ? '0 4px 16px rgba(5,150,105,0.3)' : 'none', transition: 'all 0.2s' }}>
              {buying ? c.signing : c.buyBtn}
            </button>
          </div>

          {/* SELL */}
          <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, letterSpacing: 1 }}>{c.sell.toUpperCase()}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#475569' }}>{c.payVend}</span>
              <span style={{ fontSize: 10, color: '#334155' }}>{c.bal}: {vendBalance !== null ? vendBalance.toLocaleString() : '...'} VEND</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type="number" value={vendSell} onChange={e => setVendSell(e.target.value)} style={inputStyle} placeholder="0.00" />
              <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: '#64748b' }}>VEND</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#475569' }}>{c.receive}</span>
              <span style={{ fontSize: 10, color: '#334155' }}>{c.vault}: {pool ? pool.vaultBalance.toFixed(3) : '...'} SOL</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input readOnly value={solReceive} style={{ ...inputStyle, color: '#f87171', cursor: 'default', fontSize: 17 }} />
              <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: '#ef4444' }}>SOL</span>
            </div>
            {pool && pool.vaultBalance < (parseFloat(vendSell) || 0) * price && parseFloat(vendSell) > 0 && (
              <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center' }}>{c.lowLiquidity}</div>
            )}
            <button onClick={handleSell} disabled={selling || !parseFloat(vendSell)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, cursor: (selling || !parseFloat(vendSell)) ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 800, background: 'transparent', border: '1px solid rgba(239,68,68,0.45)', color: '#ef4444', opacity: !parseFloat(vendSell) ? 0.4 : 1, transition: 'all 0.2s' }}>
              {selling ? c.signing : c.sellBtn}
            </button>
          </div>
        </div>

        {/* ── CENTER: CHART + HISTORY ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>VEND / SOL</span>
                  <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>DEVNET</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#10b981', letterSpacing: '-0.5px' }}>{price.toFixed(5)}</span>
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>SOL</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['1D', '1W', '1M'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{ padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: period === p ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${period === p ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.07)'}`, color: period === p ? '#10b981' : '#475569', transition: 'all 0.2s' }}>{p}</button>
                ))}
              </div>
            </div>
            <CandleChart period={period} />
            {pool && (
              <div style={{ display: 'flex', gap: 28, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                {[
                  { label: c.totalSold, value: `${pool.totalSold.toFixed(0)} VEND` },
                  { label: c.buybacks,  value: `${pool.totalBoughtBack.toFixed(0)} VEND` },
                  { label: c.vaultLbl, value: `${pool.vaultBalance.toFixed(3)} SOL` },
                  { label: c.priceLbl, value: `${price.toFixed(4)} SOL`, color: '#10b981' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: color ?? '#94a3b8' }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{c.historyTitle}</div>
              {saleLoading && <span style={{ fontSize: 11, color: '#334155' }}>{c.updating}</span>}
            </div>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#334155', fontSize: 13, padding: '20px 0' }}>{c.noTrades}</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '52px 90px 90px 80px 1fr', gap: 8, padding: '0 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {c.histCols.map(h => <div key={h} style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h.toUpperCase()}</div>)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {history.map((tx, i) => (
                    <a key={i} href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '52px 90px 90px 80px 1fr', gap: 8, padding: '9px 8px', borderRadius: 8, alignItems: 'center', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: tx.type === 'Buy' ? '#10b981' : '#ef4444' }}>{tx.type === 'Buy' ? c.typeBuy : c.typeSell}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{tx.amount.toFixed(1)} VEND</span>
                        <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{tx.solAmount.toFixed(4)}</span>
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

        {/* ── RIGHT: ECO + ORDER FLOW ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(5,150,105,0.12) 0%,rgba(5,150,105,0.04) 100%)', border: '1px solid rgba(5,150,105,0.22)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>{c.ecoTag.toUpperCase()}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.3, marginBottom: 6 }}>{c.ecoTitle}</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#10b981', marginBottom: 10, lineHeight: 1, letterSpacing: '-1px' }}>18% <span style={{ fontSize: 16, color: '#059669' }}>APY</span></div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.75, marginBottom: 14 }}>{c.ecoDesc}</p>
            <Link href="/staking" style={{ fontSize: 12, color: '#10b981', fontWeight: 700, textDecoration: 'none' }}>{c.goStaking}</Link>
          </div>

          <div style={{ ...card, padding: 18, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 14 }}>{c.orderFlow.toUpperCase()}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 76px', gap: 4, padding: '0 4px 8px', marginBottom: 4 }}>
              {['PRICE', 'AMT', 'TIME'].map(h => (
                <div key={h} style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h}</div>
              ))}
            </div>
            {sellOrders.map((o, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 76px', gap: 4, padding: '6px 4px', borderRadius: 6, background: 'rgba(239,68,68,0.04)', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'monospace', fontWeight: 600 }}>{o.price}</span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', textAlign: 'right' }}>{o.amount}</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace', textAlign: 'right' }}>{o.time}</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', fontSize: 9, color: '#334155', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '4px 0', letterSpacing: 0.5, fontFamily: 'monospace' }}>{c.spread}: 0.00002</div>
            {buyOrders.map((o, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 76px', gap: 4, padding: '6px 4px', borderRadius: 6, background: 'rgba(16,185,129,0.04)', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'monospace', fontWeight: 600 }}>{o.price}</span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', textAlign: 'right' }}>{o.amount}</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace', textAlign: 'right' }}>{o.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      {toast && <Toast msg={toast.msg} ok={toast.ok} title={toast.ok ? c.toastOk : c.toastFail} onClose={() => setToast(null)} />}
    </div>
  )
}
