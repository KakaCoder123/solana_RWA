'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import { useStaking } from '@/hooks/useStaking'
import { useWalletData } from '@/hooks/useWalletData'

// ── Mock chart data (no historical on-chain data yet) ──────────────
function genChart(points: number, start: number): number[] {
  const data: number[] = []
  let v = start
  for (let i = 0; i < points; i++) {
    v += (Math.random() - 0.38) * 0.6
    data.push(Math.max(0.1, v))
  }
  return data
}
const CHART_30D = genChart(30, 2)
const CHART_90D = genChart(90, 1.5)
const CHART_1Y  = genChart(180, 1)

// ── SVG Line Chart ─────────────────────────────────────────────────
function LineChart({ data, period }: { data: number[]; period: string }) {
  const W = 600, H = 160
  const pad = { t: 16, b: 28, l: 8, r: 8 }
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => ({
    x: pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r),
    y: pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b),
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`
  const last = pts[pts.length - 1]
  const labelSets: Record<string, { idx: number[]; txt: string[] }> = {
    '30D': { idx: [0, 9, 19, data.length - 1],  txt: ['DAY 1', 'DAY 10', 'DAY 20', 'TODAY'] },
    '90D': { idx: [0, 29, 59, data.length - 1], txt: ['DAY 1', 'DAY 30', 'DAY 60', 'TODAY'] },
    '1Y':  { idx: [0, 44, 89, data.length - 1], txt: ['DAY 1', 'DAY 45', 'DAY 90', 'TODAY'] },
  }
  const ls = labelSets[period] ?? labelSets['30D']
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }}>
      <defs>
        <linearGradient id={`ag${period}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#ag${period})`} />
      <path d={line} fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4" fill="#14F195" />
      <circle cx={last.x} cy={last.y} r="8" fill="none" stroke="#14F195" strokeOpacity="0.25" strokeWidth="1.5" />
      {ls.idx.map((idx, i) => (
        <text key={i} x={pts[idx]?.x ?? 0} y={H - 6} textAnchor="middle"
          fill="#334155" fontSize="9" fontFamily="monospace">{ls.txt[i]}</text>
      ))}
    </svg>
  )
}

// ── Real countdown from unlock timestamp ───────────────────────────
function UnlockCountdown({ unlockTs }: { unlockTs: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, unlockTs - Date.now() / 1000))

  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(Math.max(0, unlockTs - Date.now() / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [unlockTs])

  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = Math.floor(remaining % 60)

  if (remaining === 0) return (
    <div style={{ fontSize: 14, color: '#14F195', fontWeight: 700, marginBottom: 18 }}>Ready to withdraw!</div>
  )

  return (
    <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
      {[{ v: d, l: 'DAYS' }, { v: h, l: 'HRS' }, { v: m, l: 'MIN' }, { v: s, l: 'SEC' }].map(({ v, l }) => (
        <div key={l} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>
            {String(v).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1.5, marginTop: 4 }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

function fmt(n: number, dec = 2) { return n.toLocaleString('en-US', { maximumFractionDigits: dec }) }

// ── Page ───────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { connected, connecting, publicKey } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [period, setPeriod] = useState<'30D' | '90D' | '1Y'>('30D')
  const [copied, setCopied] = useState(false)

  const { pool, userStake, unstakeRequest, apyPercent } = useStaking()
  const { assets, recentTxs, loading: walletLoading } = useWalletData(pool?.vendMint ?? null)

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
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569', fontSize: 14 }}>Загрузка...</div>
    </div>
  )
  if (!connected) return null

  const addrShort = publicKey ? `0X...${publicKey.toString().slice(-4).toUpperCase()}` : '0X...????'
  const refSuffix = publicKey?.toString().slice(-4).toLowerCase() ?? '4f6e'
  const chartData = period === '30D' ? CHART_30D : period === '90D' ? CHART_90D : CHART_1Y

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* ── LEFT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 74, height: 74, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(153,69,255,0.2), rgba(20,241,149,0.1))',
                border: '2px solid #9945FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
              }}>👤</div>
              <div style={{
                position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)',
                background: '#14F195', color: '#000', fontSize: 8, fontWeight: 900,
                padding: '2px 7px', borderRadius: 4, letterSpacing: 0.5, whiteSpace: 'nowrap',
              }}>✓ VERIFIED</div>
            </div>
            <div>
              <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1px', marginBottom: 12, fontFamily: 'monospace' }}>
                {addrShort}
              </h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCopy} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
                }}>
                  {copied ? '✓' : '⧉'} {copied ? 'Скопировано' : 'Copy Address'}
                </button>
                <a
                  href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`}
                  target="_blank" rel="noreferrer"
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '7px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
                    textDecoration: 'none',
                  }}>↗</a>
              </div>
            </div>
          </div>

          {/* Asset cards — REAL DATA */}
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5 }}>YOUR ASSETS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>

            {/* VEND */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(153,69,255,0.13) 0%, rgba(153,69,255,0.04) 100%)',
              border: '1px solid rgba(153,69,255,0.28)', borderRadius: 16, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'rgba(153,69,255,0.18)', border: '1px solid rgba(153,69,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 13, color: '#9945FF',
                  }}>V</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#9945FF' }}>VEND</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>VendChain Token</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: '#14F195',
                  background: 'rgba(20,241,149,0.08)', padding: '3px 7px', borderRadius: 5,
                }}>DEVNET</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.5px' }}>
                {walletLoading ? '—' : fmt(assets.vendBalance, 2)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>tokens in wallet</div>
            </div>

            {/* SOL */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(20,241,149,0.10) 0%, rgba(20,241,149,0.02) 100%)',
              border: '1px solid rgba(20,241,149,0.22)', borderRadius: 16, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'rgba(20,241,149,0.12)', border: '1px solid rgba(20,241,149,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 15, color: '#14F195',
                  }}>◎</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#14F195' }}>SOL</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>Solana</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: '#14F195',
                  background: 'rgba(20,241,149,0.08)', padding: '3px 7px', borderRadius: 5,
                }}>DEVNET</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.5px' }}>
                {walletLoading ? '—' : fmt(assets.solBalance, 4)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>for gas fees</div>
            </div>

            {/* STAKED */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.03) 100%)',
              border: '1px solid rgba(99,102,241,0.26)', borderRadius: 16, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>🔒</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>STAKED</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>
                      {userStake ? '1 position' : 'no positions'}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: '#818cf8',
                  background: 'rgba(99,102,241,0.1)', padding: '3px 7px', borderRadius: 5,
                }}>{apyPercent.toFixed(1)}% APY</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.5px' }}>
                {fmt(userStake?.stakedAmount ?? 0, 2)}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>VEND locked on-chain</div>
            </div>

          </div>

          {/* Chart */}
          <div style={{ ...card, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>YIELD PERFORMANCE</h2>
                <p style={{ fontSize: 12, color: '#475569' }}>
                  Projected {period === '30D' ? '30' : period === '90D' ? '90' : '365'}-day earnings at {apyPercent.toFixed(1)}% APY
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['30D', '90D', '1Y'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: period === p ? '#6366f1' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${period === p ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                    color: period === p ? '#fff' : '#64748b', transition: 'all 0.2s',
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <LineChart data={chartData} period={period} />
          </div>

          {/* Recent Activity — REAL TRANSACTIONS */}
          <div style={{ ...card, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 900, letterSpacing: 1 }}>RECENT TRANSACTIONS</h2>
              <a
                href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}
              >View on Explorer →</a>
            </div>

            {walletLoading ? (
              <div style={{ color: '#334155', fontSize: 13, padding: '12px 0' }}>Loading transactions...</div>
            ) : recentTxs.length === 0 ? (
              <div style={{ color: '#334155', fontSize: 13, padding: '12px 0' }}>No transactions found.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 90px', gap: 8, padding: '0 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['SIGNATURE', 'DATE', 'STATUS'].map(h => (
                    <div key={h} style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {recentTxs.map(tx => (
                    <div key={tx.signature} style={{
                      display: 'grid', gridTemplateColumns: '1fr 160px 90px', gap: 8,
                      padding: '12px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      alignItems: 'center',
                    }}>
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank" rel="noreferrer"
                        style={{ fontSize: 13, color: '#818cf8', fontFamily: 'monospace', textDecoration: 'none' }}
                      >{tx.shortSig}</a>
                      <div style={{ fontSize: 12, color: '#475569' }}>{tx.dateStr}</div>
                      <div style={{ fontSize: 11, color: '#14F195', fontWeight: 700, letterSpacing: 0.5 }}>CONFIRMED</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Referral */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1.5, marginBottom: 14 }}>REFERRAL NETWORK</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>—</div>
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, marginTop: 4 }}>INVITES</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#475569' }}>Coming soon</div>
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, marginTop: 4 }}>BONUS EARNED</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#64748b',
                fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>vendchain.io/ref/{refSuffix}</div>
              <button onClick={() => navigator.clipboard.writeText(`vendchain.io/ref/${refSuffix}`)} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
              }}>⧉</button>
            </div>
          </div>

          {/* Active Positions — REAL DATA */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.8 }}>ACTIVE POSITIONS</h2>
              {(userStake || unstakeRequest) && (
                <div style={{ background: '#14F195', color: '#000', fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 4, letterSpacing: 1 }}>LIVE</div>
              )}
            </div>

            {/* Staking position */}
            {userStake && userStake.stakedAmount > 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{ fontSize: 9, color: '#14F195', fontWeight: 700, letterSpacing: 1.2 }}>STAKING VAULT</div>
                  <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1 }}>APY</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{fmt(userStake.stakedAmount)} VEND</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#14F195' }}>{apyPercent.toFixed(1)}%</div>
                </div>
                {userStake.pendingRewards > 0 && (
                  <div style={{ fontSize: 12, color: '#14F195', marginBottom: 10 }}>
                    +{fmt(userStake.pendingRewards, 6)} VEND pending
                  </div>
                )}
                <Link href="/staking" style={{
                  display: 'block', width: '100%', padding: '9px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  textDecoration: 'none', textAlign: 'center',
                }}>MANAGE POSITION →</Link>
              </div>
            ) : null}

            {/* Unstake request */}
            {unstakeRequest && (
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#FFB800', fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>UNSTAKE REQUEST</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>{fmt(unstakeRequest.amount)} VEND</div>
                {unstakeRequest.isUnlocked ? (
                  <div style={{ fontSize: 12, color: '#14F195', fontWeight: 600, marginBottom: 10 }}>✓ Ready to withdraw</div>
                ) : (
                  <UnlockCountdown unlockTs={unstakeRequest.unlockTs} />
                )}
                <Link href="/staking" style={{
                  display: 'block', width: '100%', padding: '9px', borderRadius: 8, cursor: 'pointer',
                  background: unstakeRequest.isUnlocked
                    ? 'linear-gradient(135deg, #FFB800, #ff8c00)'
                    : 'rgba(255,255,255,0.05)',
                  border: unstakeRequest.isUnlocked ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: unstakeRequest.isUnlocked ? '#000' : '#94a3b8',
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  textDecoration: 'none', textAlign: 'center',
                }}>{unstakeRequest.isUnlocked ? 'WITHDRAW NOW →' : 'VIEW STATUS →'}</Link>
              </div>
            )}

            {!userStake && !unstakeRequest && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>📊</div>
                <div style={{ fontSize: 12, color: '#334155', marginBottom: 14 }}>No active positions</div>
                <Link href="/staking" style={{
                  display: 'inline-block', padding: '9px 20px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #6366f1, #9945FF)',
                  color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                }}>START STAKING →</Link>
              </div>
            )}
          </div>

          {/* Boost Yield */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>💡</span>
              <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>BOOST YOUR YIELD</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.75, marginBottom: 14 }}>
              Hold more than 50,000 VEND to unlock the{' '}
              <span style={{ color: '#14F195', fontWeight: 700 }}>Titan Tier</span>{' '}
              and get +5% additional staking rewards.
            </p>
            <Link href="/staking" style={{ fontSize: 13, color: '#9945FF', fontWeight: 600, textDecoration: 'none' }}>
              Learn More →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
