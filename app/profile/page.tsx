'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import { useStaking } from '@/hooks/useStaking'
import { useWalletData } from '@/hooks/useWalletData'
import { VEND_MINT } from '@/lib/anchor'

type Lang = 'ru' | 'en'

// ── Translations ──────────────────────────────────────────────────────
const T = {
  ru: {
    loading: 'Загрузка...',
    verified: 'Верифицирован',
    copyAddr: 'Скопировать адрес', copied: 'Скопировано',
    assets: 'Активы',
    vendSub: 'VendChain токен', solSub: 'Для оплаты газа', stakedSub: 'Застейкано',
    positions: 'Позиции', noPositions: 'Активных позиций нет',
    stake: 'В стейкинге', apy: 'Доходность', pending: 'Накоплено',
    managePos: 'Управлять →', unstakeReq: 'Запрос на вывод',
    readyWithdraw: '✓ Готово к выводу', viewStatus: 'Смотреть →', withdrawNow: 'Вывести →',
    startStaking: 'Начать стейкинг →',
    chart: 'Динамика дохода',
    chartSub: (p: string, apy: string) => `Прогноз на ${p === '30D' ? '30' : p === '90D' ? '90' : '365'} дней при ${apy}% APY`,
    txs: 'Последние транзакции', viewExplorer: 'Explorer →',
    txCols: ['Подпись', 'Дата', 'Статус'],
    loadingTx: 'Загрузка транзакций...', noTx: 'Транзакции не найдены.',
    confirmed: 'Подтверждено',
    referral: 'Реферальная программа', invites: 'Приглашений', bonus: 'Бонусов',
    comingSoon: 'Скоро', copyLink: 'Скопировать',
    boost: 'Увеличь доходность',
    boostDesc: (amt: string) => `Удерживай более ${amt} VEND и получай дополнительные +5% к стейкинг-наградам уровня Titan.`,
    learnMore: 'Подробнее →',
    devnet: 'DEVNET',
    walletTokens: 'токенов в кошельке',
    onePosition: '1 позиция',
    noPos: 'нет позиций',
  },
  en: {
    loading: 'Loading...',
    verified: 'Verified',
    copyAddr: 'Copy Address', copied: 'Copied',
    assets: 'Your assets',
    vendSub: 'VendChain Token', solSub: 'For gas fees', stakedSub: 'Staked VEND',
    positions: 'Active positions', noPositions: 'No active positions',
    stake: 'Staked', apy: 'APY', pending: 'Pending',
    managePos: 'Manage →', unstakeReq: 'Unstake request',
    readyWithdraw: '✓ Ready to withdraw', viewStatus: 'View status →', withdrawNow: 'Withdraw →',
    startStaking: 'Start staking →',
    chart: 'Yield performance',
    chartSub: (p: string, apy: string) => `Projected ${p === '30D' ? '30' : p === '90D' ? '90' : '365'}-day earnings at ${apy}% APY`,
    txs: 'Recent transactions', viewExplorer: 'Explorer →',
    txCols: ['Signature', 'Date', 'Status'],
    loadingTx: 'Loading transactions...', noTx: 'No transactions found.',
    confirmed: 'Confirmed',
    referral: 'Referral program', invites: 'Invites', bonus: 'Bonus',
    comingSoon: 'Coming soon', copyLink: 'Copy',
    boost: 'Boost your yield',
    boostDesc: (amt: string) => `Hold more than ${amt} VEND to unlock Titan Tier and earn an additional +5% staking rewards.`,
    learnMore: 'Learn more →',
    devnet: 'DEVNET',
    walletTokens: 'tokens in wallet',
    onePosition: '1 position',
    noPos: 'no positions',
  },
} as const

// ── Mock chart data ───────────────────────────────────────────────────
function genChart(points: number, start: number): number[] {
  const data: number[] = []; let v = start
  for (let i = 0; i < points; i++) { v += (Math.random() - 0.38) * 0.6; data.push(Math.max(0.1, v)) }
  return data
}
const CHART_30D = genChart(30, 2), CHART_90D = genChart(90, 1.5), CHART_1Y = genChart(180, 1)

// ── SVG Line Chart ────────────────────────────────────────────────────
function LineChart({ data, period }: { data: number[]; period: string }) {
  const W = 600, H = 140
  const pad = { t: 12, b: 26, l: 8, r: 8 }
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => ({
    x: pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r),
    y: pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b),
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`
  const last = pts[pts.length - 1]
  const labels: Record<string, { idx: number[]; txt: string[] }> = {
    '30D': { idx: [0, 9, 19, data.length - 1],  txt: ['1', '10', '20', '→'] },
    '90D': { idx: [0, 29, 59, data.length - 1], txt: ['1', '30', '60', '→'] },
    '1Y':  { idx: [0, 44, 89, data.length - 1], txt: ['1', '45', '90', '→'] },
  }
  const ls = labels[period] ?? labels['30D']
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140 }}>
      <defs>
        <linearGradient id={`ag${period}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#ag${period})`} />
      <path d={line} fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4" fill="#10b981" />
      <circle cx={last.x} cy={last.y} r="8" fill="none" stroke="#10b981" strokeOpacity="0.3" strokeWidth="1.5" />
      {ls.idx.map((idx, i) => (
        <text key={i} x={pts[idx]?.x ?? 0} y={H - 6} textAnchor="middle" fill="#334155" fontSize="9" fontFamily="monospace">{ls.txt[i]}</text>
      ))}
    </svg>
  )
}

// ── Countdown ─────────────────────────────────────────────────────────
function UnlockCountdown({ unlockTs, lang }: { unlockTs: number; lang: Lang }) {
  const [rem, setRem] = useState(Math.max(0, unlockTs - Date.now() / 1000))
  useEffect(() => {
    const iv = setInterval(() => setRem(Math.max(0, unlockTs - Date.now() / 1000)), 1000)
    return () => clearInterval(iv)
  }, [unlockTs])
  const d = Math.floor(rem / 86400), h = Math.floor((rem % 86400) / 3600)
  const m = Math.floor((rem % 3600) / 60), s = Math.floor(rem % 60)
  if (rem === 0) return <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700, marginBottom: 12 }}>{lang === 'ru' ? 'Готово к выводу!' : 'Ready to withdraw!'}</div>
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
      {[{ v: d, l: lang === 'ru' ? 'ДН' : 'D' }, { v: h, l: lang === 'ru' ? 'ЧС' : 'H' }, { v: m, l: lang === 'ru' ? 'МН' : 'M' }, { v: s, l: lang === 'ru' ? 'СК' : 'S' }].map(({ v, l }) => (
        <div key={l} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#f1f5f9' }}>{String(v).padStart(2, '0')}</div>
          <div style={{ fontSize: 9, color: '#334155', letterSpacing: 1, marginTop: 3 }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

function fmt(n: number, dec = 2) { return n.toLocaleString('en-US', { maximumFractionDigits: dec }) }

// ── Page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { connected, connecting, publicKey } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<Lang>('ru')
  const [period, setPeriod] = useState<'30D' | '90D' | '1Y'>('30D')
  const [copied, setCopied] = useState(false)

  const { userStake, unstakeRequest, apyPercent } = useStaking()
  const { assets, recentTxs, loading: walletLoading } = useWalletData(VEND_MINT)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted && !connecting && !connected) router.push('/')
  }, [mounted, connecting, connected, router])

  const handleCopy = () => {
    if (!publicKey) return
    navigator.clipboard.writeText(publicKey.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!mounted || connecting) return (
    <div style={{ background: '#080c12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#475569', fontSize: 13 }}>{T[lang].loading}</span>
    </div>
  )
  if (!connected) return null

  const c = T[lang]
  const addrShort = publicKey ? `${publicKey.toString().slice(0, 6)}…${publicKey.toString().slice(-4)}` : '—'
  const refSuffix = publicKey?.toString().slice(-4).toLowerCase() ?? '4f6e'
  const chartData = period === '30D' ? CHART_30D : period === '90D' ? CHART_90D : CHART_1Y

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '22px 24px',
  }

  return (
    <div style={{ background: '#080c12', minHeight: '100vh', color: '#f1f5f9' }}>
      <NavBar lang={lang} onToggleLang={() => setLang(l => l === 'ru' ? 'en' : 'ru')} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 5% 60px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>

        {/* ══ LEFT ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile header */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 66, height: 66, borderRadius: 16, background: 'linear-gradient(135deg,rgba(5,150,105,0.18),rgba(79,70,229,0.12))', border: '1.5px solid rgba(5,150,105,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
              <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 8, fontWeight: 800, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>✓ {c.verified.toUpperCase()}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#334155', marginBottom: 6, letterSpacing: 0.5 }}>WALLET</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff', fontFamily: 'monospace', marginBottom: 12 }}>{addrShort}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '6px 14px', color: copied ? '#10b981' : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}>
                  {copied ? '✓' : '⧉'} {copied ? c.copied : c.copyAddr}
                </button>
                <a href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`} target="_blank" rel="noreferrer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>↗</a>
              </div>
            </div>
          </div>

          {/* Assets */}
          <div>
            <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>{c.assets.toUpperCase()}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {/* VEND */}
              <div style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#10b981' }}>V</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>VEND</div>
                      <div style={{ fontSize: 10, color: '#334155' }}>{c.vendSub}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', background: 'rgba(5,150,105,0.1)', padding: '2px 7px', borderRadius: 5 }}>{c.devnet}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 3 }}>{walletLoading ? '—' : fmt(assets.vendBalance, 2)}</div>
                <div style={{ fontSize: 11, color: '#334155' }}>{c.walletTokens}</div>
              </div>

              {/* SOL */}
              <div style={{ background: 'rgba(153,69,255,0.05)', border: '1px solid rgba(153,69,255,0.18)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#a78bfa' }}>◎</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>SOL</div>
                      <div style={{ fontSize: 10, color: '#334155' }}>Solana</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', background: 'rgba(153,69,255,0.1)', padding: '2px 7px', borderRadius: 5 }}>{c.devnet}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 3 }}>{walletLoading ? '—' : fmt(assets.solBalance, 4)}</div>
                <div style={{ fontSize: 11, color: '#334155' }}>{c.solSub}</div>
              </div>

              {/* STAKED */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔒</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{c.stakedSub}</div>
                      <div style={{ fontSize: 10, color: '#334155' }}>{userStake ? c.onePosition : c.noPos}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5 }}>{apyPercent.toFixed(1)}%</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 3 }}>{fmt(userStake?.stakedAmount ?? 0, 2)}</div>
                <div style={{ fontSize: 11, color: '#334155' }}>VEND</div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{c.chart}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{c.chartSub(period, apyPercent.toFixed(1))}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['30D', '90D', '1Y'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: period === p ? 'rgba(5,150,105,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${period === p ? 'rgba(5,150,105,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    color: period === p ? '#10b981' : '#475569', transition: 'all 0.2s',
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <LineChart data={chartData} period={period} />
          </div>

          {/* Transactions */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{c.txs}</div>
              <a href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>{c.viewExplorer}</a>
            </div>
            {walletLoading ? (
              <div style={{ color: '#334155', fontSize: 13 }}>{c.loadingTx}</div>
            ) : recentTxs.length === 0 ? (
              <div style={{ color: '#334155', fontSize: 13 }}>{c.noTx}</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 90px', gap: 8, padding: '0 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 8 }}>
                  {c.txCols.map(h => <div key={h} style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h.toUpperCase()}</div>)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentTxs.map(tx => (
                    <div key={tx.signature} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 90px', gap: 8, padding: '11px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <a href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', textDecoration: 'none' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#10b981' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#64748b' }}
                      >{tx.shortSig}</a>
                      <div style={{ fontSize: 11, color: '#475569' }}>{tx.dateStr}</div>
                      <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>{c.confirmed}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Active positions */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{c.positions}</div>
              {(userStake || unstakeRequest) && (
                <div style={{ background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)', color: '#10b981', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, letterSpacing: 1 }}>LIVE</div>
              )}
            </div>

            {userStake && userStake.stakedAmount > 0 && (
              <div style={{ background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>{c.stake.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{fmt(userStake.stakedAmount)} <span style={{ fontSize: 11, color: '#64748b' }}>VEND</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1, marginBottom: 3 }}>{c.apy.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{apyPercent.toFixed(1)}%</div>
                  </div>
                </div>
                {userStake.pendingRewards > 0 && (
                  <div style={{ fontSize: 12, color: '#059669', marginBottom: 10 }}>+{fmt(userStake.pendingRewards, 6)} VEND {c.pending.toLowerCase()}</div>
                )}
                <Link href="/staking" style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)', color: '#10b981', fontSize: 12, fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(5,150,105,0.18)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(5,150,105,0.1)' }}
                >{c.managePos}</Link>
              </div>
            )}

            {unstakeRequest && (
              <div style={{ background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{c.unstakeReq.toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10 }}>{fmt(unstakeRequest.amount)} <span style={{ fontSize: 11, color: '#64748b' }}>VEND</span></div>
                {unstakeRequest.isUnlocked ? (
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 10 }}>{c.readyWithdraw}</div>
                ) : (
                  <UnlockCountdown unlockTs={unstakeRequest.unlockTs} lang={lang} />
                )}
                <Link href="/staking" style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8, background: unstakeRequest.isUnlocked ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.04)', border: unstakeRequest.isUnlocked ? 'none' : '1px solid rgba(255,255,255,0.08)', color: unstakeRequest.isUnlocked ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700, textDecoration: 'none', boxShadow: unstakeRequest.isUnlocked ? '0 4px 14px rgba(5,150,105,0.25)' : 'none' }}>
                  {unstakeRequest.isUnlocked ? c.withdrawNow : c.viewStatus}
                </Link>
              </div>
            )}

            {!userStake && !unstakeRequest && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 20 }}>◎</div>
                <div style={{ fontSize: 12, color: '#334155', marginBottom: 14 }}>{c.noPositions}</div>
                <Link href="/staking" style={{ display: 'inline-block', padding: '9px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(5,150,105,0.28)' }}>{c.startStaking}</Link>
              </div>
            )}
          </div>

          {/* Referral */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 16 }}>{c.referral}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 3 }}>—</div>
                <div style={{ fontSize: 10, color: '#334155', letterSpacing: 0.5 }}>{c.invites.toUpperCase()}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 3 }}>{c.comingSoon}</div>
                <div style={{ fontSize: 10, color: '#334155', letterSpacing: 0.5 }}>{c.bonus.toUpperCase()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#334155', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                vendchain.io/ref/{refSuffix}
              </div>
              <button onClick={() => navigator.clipboard.writeText(`vendchain.io/ref/${refSuffix}`)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px 12px', color: '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#10b981' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
              >⧉</button>
            </div>
          </div>

          {/* Boost */}
          <div style={{ ...card, background: 'linear-gradient(135deg,rgba(5,150,105,0.07) 0%,rgba(79,70,229,0.04) 100%)', border: '1px solid rgba(5,150,105,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>💡</div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{c.boost}</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.75, marginBottom: 14 }}>
              {c.boostDesc('50,000')} <span style={{ color: '#10b981', fontWeight: 700 }}>Titan Tier</span>.
            </p>
            <Link href="/staking" style={{ fontSize: 12, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>{c.learnMore}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
