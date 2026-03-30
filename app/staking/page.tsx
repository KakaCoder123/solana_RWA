'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'

// ── Types ──────────────────────────────────────────────────────
type LockPeriod = '30D' | '90D' | '180D'

interface ActiveStake {
  tier: string
  id: string
  color: string
  staked: string
  stakedUsd: string
  rewards: string
  progress: number
  daysLeft: number
  claimable: boolean
}

// ── Mock data ──────────────────────────────────────────────────
const TIERS = [
  {
    name: 'BRONZE TIER',
    icon: '🥉',
    desc: 'Entry-level yield for short-term liquidity maintenance.',
    duration: '30 Days',
    apy: '5%',
    apyNum: 5,
    minStake: '1,000 VEND',
    minNum: 1000,
    color: '#CD7F32',
    glow: 'rgba(205,127,50,0.15)',
    border: 'rgba(205,127,50,0.25)',
    popular: false,
  },
  {
    name: 'SILVER TIER',
    icon: '🥈',
    desc: 'Balanced risk-reward ratio for established holders.',
    duration: '90 Days',
    apy: '12%',
    apyNum: 12,
    minStake: '10,000 VEND',
    minNum: 10000,
    color: '#14F195',
    glow: 'rgba(99,102,241,0.2)',
    border: 'rgba(99,102,241,0.5)',
    popular: true,
  },
  {
    name: 'GOLD TIER',
    icon: '🏆',
    desc: 'Maximum rewards for the long-term governance partners.',
    duration: '180 Days',
    apy: '22%',
    apyNum: 22,
    minStake: '50,000 VEND',
    minNum: 50000,
    color: '#FFB800',
    glow: 'rgba(255,184,0,0.12)',
    border: 'rgba(255,184,0,0.25)',
    popular: false,
  },
]

const ACTIVE_STAKES: ActiveStake[] = [
  { tier: 'SILVER', id: '#VC-3821', color: '#818cf8', staked: '12,000 VEND', stakedUsd: '$1,200.00', rewards: '+142.50 VEND', progress: 65, daysLeft: 22, claimable: true },
  { tier: 'BRONZE', id: '#VC-9194', color: '#CD7F32', staked: '5,000 VEND',  stakedUsd: '$500.00',    rewards: '+12.20 VEND',  progress: 12, daysLeft: 26, claimable: false },
]

const APY_BY_PERIOD: Record<LockPeriod, number> = { '30D': 5, '90D': 12, '180D': 22 }
const DAYS_BY_PERIOD: Record<LockPeriod, number> = { '30D': 30, '90D': 90, '180D': 180 }

// ── Page ───────────────────────────────────────────────────────
export default function StakingPage() {
  const { connected, connecting } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [calcAmt, setCalcAmt] = useState('')
  const [lockPeriod, setLockPeriod] = useState<LockPeriod>('30D')
  const [stakeModal, setStakeModal] = useState<typeof TIERS[0] | null>(null)
  const [stakeInput, setStakeInput] = useState('')
  const [claimed, setClaimed] = useState<string[]>([])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted && !connecting && !connected) router.push('/')
  }, [mounted, connecting, connected, router])

  if (!mounted || connecting) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569', fontSize: 14 }}>Загрузка...</div>
    </div>
  )
  if (!connected) return null

  // Calc
  const calcNum = parseFloat(calcAmt) || 0
  const apy = APY_BY_PERIOD[lockPeriod]
  const days = DAYS_BY_PERIOD[lockPeriod]
  const estimatedReward = calcNum > 0 ? (calcNum * (apy / 100) * (days / 365)).toFixed(2) : '0.00'
  const roiPct = `${apy.toFixed(1)}%`

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '60px 32px 48px',
        display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, alignItems: 'center',
      }}>
        {/* Left: title */}
        <div>
          <h1 style={{
            fontSize: 'clamp(52px, 7vw, 88px)', fontWeight: 900,
            letterSpacing: '-3px', lineHeight: 0.95, marginBottom: 28,
            userSelect: 'none',
          }}>
            <span style={{ color: '#fff' }}>STAKING</span><br />
            <span style={{
              background: 'linear-gradient(90deg, #6366f1, #9945FF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>PROTOCOL</span>
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.75, maxWidth: 460 }}>
            Commit your VEND assets to secure the decentralized vending ecosystem.
            High-yield liquidity provision across multiple tiers.
          </p>
        </div>

        {/* Right: stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ ...card, padding: '20px 22px' }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>GLOBAL TVL</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>$12.4M</div>
              <div style={{ fontSize: 12, color: '#14F195' }}>↑ +4.2%</div>
            </div>
            <div style={{ ...card, padding: '20px 22px' }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>AVG APY</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#14F195', marginBottom: 6 }}>14.2%</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Dynamic optimization</div>
            </div>
          </div>

          {/* Your share */}
          <div style={{
            ...card, padding: '20px 22px',
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5 }}>YOUR SHARE</div>
              <div style={{
                background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: 6, padding: '2px 10px', fontSize: 9, color: '#818cf8', fontWeight: 700, letterSpacing: 1,
              }}>ACTIVE ACCOUNT</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 26, fontWeight: 900 }}>
                42,500.00 <span style={{ fontSize: 16, color: '#818cf8' }}>VEND</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>≈ $4,250.00</div>
                <div style={{ fontSize: 11, color: '#475569' }}>0.34% of pool</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIERS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>AVAILABLE TIERS</h2>
          <div style={{ fontSize: 12, color: '#475569' }}>
            SORT BY: <span style={{ color: '#818cf8', fontWeight: 700 }}>ROI High</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {TIERS.map(tier => (
            <div key={tier.name} style={{
              position: 'relative',
              background: tier.popular
                ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.05))'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tier.border}`,
              borderRadius: 18,
              padding: '28px 26px',
              boxShadow: tier.popular ? `0 0 40px ${tier.glow}` : 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 48px ${tier.glow}` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = tier.popular ? `0 0 40px ${tier.glow}` : 'none' }}
            >
              {/* Most popular badge */}
              {tier.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #6366f1, #9945FF)',
                  borderRadius: 20, padding: '4px 16px',
                  fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#fff', whiteSpace: 'nowrap',
                }}>MOST POPULAR</div>
              )}

              {/* Icon */}
              <div style={{ fontSize: 28, marginBottom: 14 }}>{tier.icon}</div>

              {/* Name + desc */}
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, letterSpacing: 0.3 }}>{tier.name}</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 24, minHeight: 40 }}>{tier.desc}</p>

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  { label: 'DURATION', value: tier.duration, valueColor: '#fff' },
                  { label: 'APY', value: tier.apy, valueColor: '#14F195' },
                  { label: 'MIN. STAKE', value: tier.minStake, valueColor: '#fff' },
                ].map(({ label, value, valueColor }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1 }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: valueColor }}>{value}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => { setStakeModal(tier); setStakeInput('') }} style={{
                width: '100%', padding: '13px', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 800, letterSpacing: 1.2,
                background: tier.popular ? 'linear-gradient(135deg, #6366f1, #9945FF)' : 'transparent',
                border: tier.popular ? 'none' : `1px solid rgba(255,255,255,0.15)`,
                color: tier.popular ? '#fff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => {
                  if (!tier.popular) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }
                  else e.currentTarget.style.opacity = '0.85'
                }}
                onMouseLeave={e => {
                  if (!tier.popular) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }
                  else e.currentTarget.style.opacity = '1'
                }}
              >STAKE NOW</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── CALCULATOR + ACTIVE STAKES ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>

        {/* YIELD CALCULATOR */}
        <div style={{ ...card, padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span style={{ fontSize: 16 }}>🧮</span>
            <h2 style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1 }}>YIELD CALCULATOR</h2>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>STAKE AMOUNT</div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={calcAmt}
                onChange={e => setCalcAmt(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '12px 52px 12px 14px',
                  color: '#fff', fontSize: 18, fontWeight: 700, outline: 'none',
                }}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: '#475569' }}>VEND</span>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>LOCK PERIOD</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['30D', '90D', '180D'] as LockPeriod[]).map(p => (
                <button key={p} onClick={() => setLockPeriod(p)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  background: lockPeriod === p ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${lockPeriod === p ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                  color: lockPeriod === p ? '#fff' : '#64748b',
                  transition: 'all 0.2s',
                }}>{p}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>ESTIMATED REWARD</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#14F195' }}>{estimatedReward} VEND</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>ROI PERCENT</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>{roiPct}</span>
            </div>
          </div>
        </div>

        {/* ACTIVE STAKES */}
        <div style={{ ...card, padding: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>⏱</span>
              <h2 style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1 }}>ACTIVE STAKES</h2>
            </div>
            <button style={{
              background: 'none', border: 'none', color: '#6366f1',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
            }}>CLAIM ALL REWARDS</button>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 160px 160px 1fr 100px', gap: 8, padding: '0 8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {['TIER / ID', 'STAKED AMOUNT', 'REWARDS', 'UNLOCKS IN', 'ACTION'].map(h => (
              <div key={h} style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: 1 }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {ACTIVE_STAKES.map((s, i) => {
              const isClaimed = claimed.includes(s.id)
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '140px 160px 160px 1fr 100px', gap: 8,
                  padding: '14px 8px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                }}>
                  {/* Tier/ID */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.tier}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{s.id}</div>
                  </div>

                  {/* Staked */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.staked}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{s.stakedUsd}</div>
                  </div>

                  {/* Rewards */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#14F195' }}>{s.rewards}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{isClaimed ? 'Claimed' : 'Unclaimed'}</div>
                  </div>

                  {/* Progress + days */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{s.progress}%</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{s.daysLeft} Days</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${s.progress}%`,
                        background: s.claimable
                          ? 'linear-gradient(90deg, #6366f1, #14F195)'
                          : '#CD7F32',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  {/* Action */}
                  {s.claimable ? (
                    <button
                      onClick={() => setClaimed(prev => [...prev, s.id])}
                      disabled={isClaimed}
                      style={{
                        padding: '7px 16px', borderRadius: 8, cursor: isClaimed ? 'default' : 'pointer',
                        fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
                        background: isClaimed ? 'rgba(255,255,255,0.05)' : '#14F195',
                        border: 'none',
                        color: isClaimed ? '#475569' : '#000',
                        transition: 'all 0.2s',
                      }}
                    >{isClaimed ? 'CLAIMED' : 'CLAIM'}</button>
                  ) : (
                    <button style={{
                      padding: '7px 16px', borderRadius: 8, cursor: 'not-allowed',
                      fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#334155',
                    }}>LOCKED</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

     

      
    </div>
  )
}
