'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import { useStaking } from '@/hooks/useStaking'

// ── Tier definitions (UI only — all map to same on-chain pool) ─────
const TIERS = [
  {
    name: 'BRONZE TIER',
    icon: '🥉',
    desc: 'Entry-level yield. Stake any amount and earn real on-chain rewards.',
    minNum: 100,
    minStake: '100 VEND',
    color: '#CD7F32',
    glow: 'rgba(205,127,50,0.15)',
    border: 'rgba(205,127,50,0.25)',
    popular: false,
  },
  {
    name: 'SILVER TIER',
    icon: '🥈',
    desc: 'Balanced staking for established VEND holders. Unlock protocol rewards.',
    minNum: 1000,
    minStake: '1,000 VEND',
    color: '#14F195',
    glow: 'rgba(99,102,241,0.2)',
    border: 'rgba(99,102,241,0.5)',
    popular: true,
  },
  {
    name: 'GOLD TIER',
    icon: '🏆',
    desc: 'Maximum exposure for long-term governance partners.',
    minNum: 10000,
    minStake: '10,000 VEND',
    color: '#FFB800',
    glow: 'rgba(255,184,0,0.12)',
    border: 'rgba(255,184,0,0.25)',
    popular: false,
  },
]

function fmtVend(n: number) { return n.toLocaleString('en-US', { maximumFractionDigits: 4 }) }
function fmtDays(sec: number) {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  return d > 0 ? `${d}d ${h}h` : `${h}h`
}

// ── Page ───────────────────────────────────────────────────────────
export default function StakingPage() {
  const { connected, connecting } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [calcAmt, setCalcAmt] = useState('')
  const [stakeModal, setStakeModal] = useState<typeof TIERS[0] | null>(null)
  const [stakeInput, setStakeInput] = useState('')
  const [unstakeInput, setUnstakeInput] = useState('')
  const [showUnstakeInput, setShowUnstakeInput] = useState(false)

  const {
    pool, userStake, unstakeRequest, vendBalance,
    loading, txLoading, error,
    apyPercent, stake, requestUnstake, withdraw, claimRewards, clearError,
  } = useStaking()

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

  // Calculator
  const calcNum = parseFloat(calcAmt) || 0
  const estimatedReward = calcNum > 0
    ? (calcNum * (apyPercent / 100) * (7 / 365)).toFixed(4)
    : '0.0000'

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
  }

  const handleStake = async () => {
    const amt = parseFloat(stakeInput)
    if (!amt || amt <= 0) return
    await stake(amt)
    setStakeModal(null)
    setStakeInput('')
  }

  const handleRequestUnstake = async () => {
    const amt = parseFloat(unstakeInput)
    if (!amt || amt <= 0 || !userStake || amt > userStake.stakedAmount) return
    await requestUnstake(amt)
    setShowUnstakeInput(false)
    setUnstakeInput('')
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: '60px 32px 48px',
        display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, alignItems: 'center',
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(52px, 7vw, 88px)', fontWeight: 900,
            letterSpacing: '-3px', lineHeight: 0.95, marginBottom: 28, userSelect: 'none',
          }}>
            <span style={{ color: '#fff' }}>STAKING</span><br />
            <span style={{
              background: 'linear-gradient(90deg, #6366f1, #9945FF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>PROTOCOL</span>
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.75, maxWidth: 460 }}>
            Commit your VEND assets to secure the decentralized vending ecosystem.
            Real on-chain rewards — 1 min lockup, linear accrual.
          </p>
          {/* On-chain badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#14F195', display: 'inline-block', boxShadow: '0 0 8px #14F195' }} />
            <span style={{ fontSize: 11, color: '#14F195', fontWeight: 700, letterSpacing: 1 }}>LIVE ON SOLANA DEVNET</span>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ ...card, padding: '20px 22px' }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>TOTAL STAKED</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
                {loading ? '—' : `${fmtVend(pool?.totalStaked ?? 0)}`}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>VEND on-chain</div>
            </div>
            <div style={{ ...card, padding: '20px 22px' }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>POOL APY</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#14F195', marginBottom: 4 }}>
                {loading ? '—' : `${apyPercent.toFixed(1)}%`}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Linear, per second</div>
            </div>
          </div>
          <div style={{ ...card, padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5 }}>REWARD VAULT</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: (pool?.rewardsAvailable ?? 0) > 0 ? '#14F195' : '#ef4444' }}>
                {loading ? '—' : fmtVend(pool?.rewardsAvailable ?? 0)}
              </span>
              <span style={{ fontSize: 11, color: '#475569' }}>VEND available</span>
            </div>
          </div>

          {/* User share */}
          <div style={{
            ...card, padding: '20px 22px',
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5 }}>YOUR STAKE</div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                Balance: <span style={{ color: '#fff', fontWeight: 700 }}>{fmtVend(vendBalance)} VEND</span>
              </div>
              <div style={{
                background: userStake ? 'rgba(20,241,149,0.15)' : 'rgba(99,102,241,0.2)',
                border: `1px solid ${userStake ? 'rgba(20,241,149,0.4)' : 'rgba(99,102,241,0.4)'}`,
                borderRadius: 6, padding: '2px 10px',
                fontSize: 9, color: userStake ? '#14F195' : '#818cf8',
                fontWeight: 700, letterSpacing: 1,
              }}>{userStake ? 'ACTIVE' : 'NO STAKE'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 26, fontWeight: 900 }}>
                {loading ? '—' : fmtVend(userStake?.stakedAmount ?? 0)}{' '}
                <span style={{ fontSize: 16, color: '#818cf8' }}>VEND</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: '#14F195', fontWeight: 700 }}>
                  +{fmtVend(userStake?.pendingRewards ?? 0)} pending
                </div>
                {pool && pool.totalStaked > 0 && userStake && (
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {((userStake.stakedAmount / pool.totalStaked) * 100).toFixed(2)}% of pool
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div style={{
          maxWidth: 1200, margin: '0 auto 16px', padding: '0 32px',
        }}>
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
            <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        </div>
      )}

      {/* ── TIERS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 56px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>AVAILABLE TIERS</h2>
          <div style={{ fontSize: 12, color: '#475569' }}>
            APY: <span style={{ color: '#14F195', fontWeight: 700 }}>{apyPercent.toFixed(1)}% (on-chain)</span>
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
              borderRadius: 18, padding: '28px 26px',
              boxShadow: tier.popular ? `0 0 40px ${tier.glow}` : 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 48px ${tier.glow}` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = tier.popular ? `0 0 40px ${tier.glow}` : 'none' }}
            >
              {tier.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #6366f1, #9945FF)',
                  borderRadius: 20, padding: '4px 16px',
                  fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#fff', whiteSpace: 'nowrap',
                }}>MOST POPULAR</div>
              )}
              <div style={{ fontSize: 28, marginBottom: 14 }}>{tier.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, letterSpacing: 0.3 }}>{tier.name}</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 24, minHeight: 40 }}>{tier.desc}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  { label: 'LOCKUP', value: '1 Min', color: '#fff' },
                  { label: 'APY', value: loading ? '—' : `${apyPercent.toFixed(1)}%`, color: '#14F195' },
                  { label: 'MIN. STAKE', value: tier.minStake, color: '#fff' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 1 }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setStakeModal(tier); setStakeInput(''); clearError() }}
                disabled={txLoading}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, cursor: txLoading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 800, letterSpacing: 1.2, opacity: txLoading ? 0.6 : 1,
                  background: tier.popular ? 'linear-gradient(135deg, #6366f1, #9945FF)' : 'transparent',
                  border: tier.popular ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  color: tier.popular ? '#fff' : '#94a3b8',
                  transition: 'all 0.2s',
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
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>1 Min (on-chain lockup)</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>ESTIMATED / 7 DAYS</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#14F195' }}>{estimatedReward} VEND</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 0.5 }}>APY (on-chain)</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>{apyPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* ACTIVE STAKES */}
        <div style={{ ...card, padding: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>⏱</span>
              <h2 style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1 }}>ON-CHAIN POSITIONS</h2>
            </div>
            {userStake && userStake.stakedAmount > 0 && (
              <button
                onClick={() => { setShowUnstakeInput(!showUnstakeInput); setUnstakeInput(''); clearError() }}
                disabled={txLoading}
                style={{
                  background: 'none', border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 8, padding: '5px 12px',
                  color: '#818cf8', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
                }}
              >REQUEST UNSTAKE</button>
            )}
          </div>

          {/* Unstake input */}
          {showUnstakeInput && userStake && (
            <div style={{
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 10, padding: 16, marginBottom: 16,
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <input
                type="number"
                value={unstakeInput}
                onChange={e => setUnstakeInput(e.target.value)}
                placeholder={`Max: ${fmtVend(userStake.stakedAmount)}`}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                  padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>VEND</span>
              <button
                onClick={handleRequestUnstake}
                disabled={txLoading}
                style={{
                  background: 'rgba(99,102,241,0.3)', border: '1px solid #6366f1',
                  borderRadius: 8, padding: '10px 16px',
                  color: '#fff', fontSize: 12, fontWeight: 800, cursor: txLoading ? 'not-allowed' : 'pointer',
                }}
              >{txLoading ? '...' : 'CONFIRM'}</button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#334155', fontSize: 13 }}>
              Loading on-chain data...
            </div>
          ) : !userStake && !unstakeRequest ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
              <div style={{ color: '#334155', fontSize: 13 }}>No active positions. Stake VEND to begin earning.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Active Stake Row */}
              {userStake && userStake.stakedAmount > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '160px 160px 1fr 120px', gap: 12,
                  padding: '14px 12px', borderRadius: 10,
                  background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#14F195', display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#14F195' }}>STAKED</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>vend_staking.sol</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtVend(userStake.stakedAmount)} VEND</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>earning {apyPercent.toFixed(1)}% APY</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#14F195' }}>+{fmtVend(userStake.pendingRewards)} VEND</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>pending rewards</div>
                  </div>
                  <button
                    onClick={claimRewards}
                    disabled={txLoading || userStake.pendingRewards === 0}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      fontSize: 12, fontWeight: 800,
                      background: userStake.pendingRewards > 0 ? '#14F195' : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      color: userStake.pendingRewards > 0 ? '#000' : '#334155',
                      cursor: txLoading || userStake.pendingRewards === 0 ? 'not-allowed' : 'pointer',
                      opacity: txLoading ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >{txLoading ? '...' : userStake.pendingRewards > 0 ? 'CLAIM' : 'NO REWARDS'}</button>
                </div>
              )}

              {/* Unstake Request Row */}
              {unstakeRequest && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '160px 160px 1fr 120px', gap: 12,
                  padding: '14px 12px', borderRadius: 10,
                  background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.2)',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB800', display: 'inline-block' }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#FFB800' }}>UNSTAKING</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>1 min lockup</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtVend(unstakeRequest.amount)} VEND</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>pending withdrawal</div>
                  </div>
                  <div>
                    {unstakeRequest.isUnlocked ? (
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#14F195' }}>Ready to withdraw!</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{fmtDays(unstakeRequest.secondsLeft)}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>until unlock</div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={withdraw}
                    disabled={txLoading || !unstakeRequest.isUnlocked}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      fontSize: 12, fontWeight: 800,
                      background: unstakeRequest.isUnlocked ? '#FFB800' : 'rgba(255,255,255,0.04)',
                      border: unstakeRequest.isUnlocked ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      color: unstakeRequest.isUnlocked ? '#000' : '#334155',
                      cursor: txLoading || !unstakeRequest.isUnlocked ? 'not-allowed' : 'pointer',
                      opacity: txLoading ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >{unstakeRequest.isUnlocked ? 'WITHDRAW' : 'LOCKED'}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── STAKE MODAL ── */}
      {stakeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setStakeModal(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f1117', border: `1px solid ${stakeModal.border}`,
              borderRadius: 20, padding: 36, width: 420,
              boxShadow: `0 0 60px ${stakeModal.glow}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{stakeModal.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.3 }}>{stakeModal.name}</h3>
              </div>
              <button onClick={() => setStakeModal(null)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, fontSize: 13 }}>
              {[
                { label: 'MIN. STAKE', value: stakeModal.minStake },
                { label: 'APY', value: `${apyPercent.toFixed(1)}%`, color: '#14F195' },
                { label: 'LOCKUP', value: '1 min (on-chain)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 800, color: color || '#fff' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1 }}>AMOUNT TO STAKE</div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  Available: <span style={{ color: '#fff', fontWeight: 700 }}>{fmtVend(vendBalance)} VEND</span>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={stakeInput}
                  onChange={e => setStakeInput(e.target.value)}
                  placeholder={`Min: ${stakeModal.minNum} VEND`}
                  autoFocus
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '14px 90px 14px 14px',
                    color: '#fff', fontSize: 18, fontWeight: 700, outline: 'none',
                  }}
                />
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setStakeInput(String(vendBalance))}
                    style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
                  >MAX</button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>VEND</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStake}
              disabled={txLoading || !stakeInput || parseFloat(stakeInput) < stakeModal.minNum}
              style={{
                width: '100%', padding: '15px', borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #9945FF)',
                border: 'none', color: '#fff',
                fontSize: 14, fontWeight: 800, letterSpacing: 1,
                cursor: (txLoading || !stakeInput || parseFloat(stakeInput) < stakeModal.minNum) ? 'not-allowed' : 'pointer',
                opacity: (txLoading || !stakeInput || parseFloat(stakeInput) < stakeModal.minNum) ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >{txLoading ? 'Sending transaction...' : 'CONFIRM STAKE'}</button>

            <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 12 }}>
              Transaction will be signed with your Solana wallet
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
