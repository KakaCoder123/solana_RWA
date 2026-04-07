'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'
import { useStaking } from '@/hooks/useStaking'

type Lang = 'ru' | 'en'

const MIN_VEND = 100

const T = {
  ru: {
    pos: {
      title: 'Моя позиция', noPos: 'Позиций нет',
      noPosDesc: 'Застейкайте VEND ниже, чтобы начать зарабатывать',
      staked: 'Застейкано', pending: 'Накоплено', share: 'Доля пула',
      claim: 'Получить награды', noRewards: 'Нет наград',
      unstake: 'Вывести', confirm: 'Подтвердить', cancel: 'Отмена',
      unstakeMax: 'Макс',
      cooldown: 'осталось', readyToWithdraw: 'Готово к выводу',
      withdraw: 'Вывести средства', locked: 'Заблокировано',
    },
    form: {
      title: 'Застейкать VEND',
      label: 'Количество VEND', min: `Мин. ${MIN_VEND} VEND`,
      apy: 'Доходность', lockup: 'Блокировка', lockupVal: 'Нет',
      type: 'Тип', typeVal: 'Staking reward',
      btn: 'Застейкать', loading: 'Отправка...',
      note: 'Подписывается вашим Solana-кошельком',
      balance: 'Баланс',
    },
    stats: { apy: 'Доходность пула', total: 'В пуле', vault: 'Наград', lockup: 'Блокировка' },
  },
  en: {
    pos: {
      title: 'My position', noPos: 'No positions',
      noPosDesc: 'Stake VEND below to start earning',
      staked: 'Staked', pending: 'Pending', share: 'Pool share',
      claim: 'Claim rewards', noRewards: 'No rewards',
      unstake: 'Unstake', confirm: 'Confirm', cancel: 'Cancel',
      unstakeMax: 'Max',
      cooldown: 'remaining', readyToWithdraw: 'Ready to withdraw',
      withdraw: 'Withdraw', locked: 'Locked',
    },
    form: {
      title: 'Stake VEND',
      label: 'VEND amount', min: `Min. ${MIN_VEND} VEND`,
      apy: 'Yield', lockup: 'Lock period', lockupVal: 'None',
      type: 'Type', typeVal: 'Staking reward',
      btn: 'Stake', loading: 'Sending...',
      note: 'Signed with your Solana wallet',
      balance: 'Balance',
    },
    stats: { apy: 'Pool APY', total: 'Total staked', vault: 'Reward vault', lockup: 'Lock period' },
  },
} as const

function fmt(n: number, d = 2) { return n.toLocaleString('en-US', { maximumFractionDigits: d }) }
function fmtTime(sec: number) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}д ${h}ч`
  if (h > 0) return `${h}ч ${m}м`
  return `${m}м`
}

export default function StakingPage() {
  const { connected, connecting } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<Lang>('ru')
  const [vendInput, setVendInput] = useState('')
  const [unstakeInput, setUnstakeInput] = useState('')
  const [showUnstake, setShowUnstake] = useState(false)

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
    <div style={{ background: '#080c12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#475569', fontSize: 13 }}>Загрузка...</span>
    </div>
  )
  if (!connected) return null

  const c = T[lang]
  const vendAmt = parseFloat(vendInput) || 0
  const canStake = vendAmt >= MIN_VEND && vendAmt <= vendBalance && !txLoading
  const displayApy = loading ? '—' : `${apyPercent > 0 ? apyPercent.toFixed(1) : '18.0'}%`

  const handleStake = async () => {
    if (!canStake) return
    await stake(vendAmt)
    setVendInput('')
  }
  const handleUnstake = async () => {
    const amt = parseFloat(unstakeInput)
    if (!amt || !userStake || amt > userStake.stakedAmount) return
    await requestUnstake(amt)
    setShowUnstake(false)
    setUnstakeInput('')
  }

  const hasPosition = !!(userStake?.stakedAmount) || !!unstakeRequest

  return (
    <div style={{ background: '#080c12', minHeight: '100vh', color: '#f1f5f9' }}>
      <NavBar lang={lang} onToggleLang={() => setLang(l => l === 'ru' ? 'en' : 'ru')} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 5% 80px' }}>

        {/* ── STATS ROW ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 22 }}>
          {[
            { label: c.stats.apy,    value: displayApy,                             accent: true  },
            { label: c.stats.total,  value: loading ? '—' : `${fmt(pool?.totalStaked ?? 0, 0)} VEND` },
            { label: c.stats.vault,  value: loading ? '—' : `${fmt(pool?.rewardsAvailable ?? 0, 0)} VEND` },
            { label: c.stats.lockup, value: c.form.lockupVal },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 5, letterSpacing: 0.5 }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: s.accent ? '#10b981' : '#f1f5f9' }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* ── POSITION BLOCK (always visible, top) ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
          style={{
            background: hasPosition
              ? 'linear-gradient(135deg,rgba(5,150,105,0.1) 0%,rgba(5,150,105,0.04) 100%)'
              : 'rgba(255,255,255,0.025)',
            border: `1px solid ${hasPosition ? 'rgba(5,150,105,0.25)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 18, padding: '24px 28px', marginBottom: 14,
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasPosition ? 20 : 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: hasPosition ? '#10b981' : '#334155', letterSpacing: 0.2 }}>{c.pos.title}</span>
            {hasPosition && userStake && pool && pool.totalStaked > 0 && (
              <span style={{ fontSize: 11, color: '#475569' }}>
                {c.pos.share}: <span style={{ color: '#64748b', fontWeight: 600 }}>{((userStake.stakedAmount / pool.totalStaked) * 100).toFixed(2)}%</span>
              </span>
            )}
          </div>

          {!hasPosition && !loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>◎</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>{c.pos.noPos}</div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{c.pos.noPosDesc}</div>
              </div>
            </div>
          ) : loading ? (
            <div style={{ color: '#334155', fontSize: 13 }}>...</div>
          ) : (
            <div>
              {/* Active stake row */}
              {userStake && userStake.stakedAmount > 0 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, letterSpacing: 0.5 }}>{c.pos.staked}</div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
                        {fmt(userStake.stakedAmount, 0)}
                        <span style={{ fontSize: 14, color: '#10b981', fontWeight: 600, marginLeft: 6 }}>VEND</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, letterSpacing: 0.5 }}>{c.pos.pending}</div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: '#10b981', letterSpacing: '-1px', lineHeight: 1 }}>
                        +{fmt(userStake.pendingRewards)}
                        <span style={{ fontSize: 14, color: '#059669', fontWeight: 600, marginLeft: 6 }}>VEND</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={claimRewards} disabled={txLoading || userStake.pendingRewards === 0}
                      style={{
                        padding: '10px 22px', borderRadius: 10, border: 'none', cursor: txLoading || userStake.pendingRewards === 0 ? 'not-allowed' : 'pointer',
                        background: userStake.pendingRewards > 0 ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.05)',
                        color: userStake.pendingRewards > 0 ? '#fff' : '#334155',
                        fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                        boxShadow: userStake.pendingRewards > 0 ? '0 4px 16px rgba(5,150,105,0.28)' : 'none',
                      }}>
                      {txLoading ? '...' : userStake.pendingRewards > 0 ? c.pos.claim : c.pos.noRewards}
                    </button>

                    <button onClick={() => { setShowUnstake(s => !s); setUnstakeInput(''); clearError() }} disabled={txLoading}
                      style={{
                        padding: '10px 22px', borderRadius: 10, cursor: 'pointer',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                        color: showUnstake ? '#f87171' : '#94a3b8', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
                      onMouseLeave={e => { if (!showUnstake) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8' } }}
                    >{showUnstake ? c.pos.cancel : c.pos.unstake}</button>
                  </div>

                  {/* Unstake input */}
                  <AnimatePresence>
                    {showUnstake && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input type="number" value={unstakeInput} onChange={e => setUnstakeInput(e.target.value)}
                              placeholder={`${c.pos.unstakeMax}: ${fmt(userStake.stakedAmount, 0)} VEND`}
                              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
                          </div>
                          <button onClick={() => setUnstakeInput(String(userStake.stakedAmount))}
                            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            {c.pos.unstakeMax}
                          </button>
                          <button onClick={handleUnstake} disabled={txLoading}
                            style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: txLoading ? 'not-allowed' : 'pointer' }}>
                            {txLoading ? '...' : c.pos.confirm}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Unstake request */}
              {unstakeRequest && (
                <div style={{ marginTop: userStake?.stakedAmount ? 16 : 0, padding: '14px 16px', borderRadius: 12, background: unstakeRequest.isUnlocked ? 'rgba(5,150,105,0.08)' : 'rgba(255,184,0,0.06)', border: `1px solid ${unstakeRequest.isUnlocked ? 'rgba(5,150,105,0.22)' : 'rgba(255,184,0,0.18)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 3 }}>{unstakeRequest.isUnlocked ? c.pos.readyToWithdraw : c.pos.locked}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: unstakeRequest.isUnlocked ? '#10b981' : '#f1f5f9' }}>
                      {fmt(unstakeRequest.amount, 0)} <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>VEND</span>
                    </div>
                    {!unstakeRequest.isUnlocked && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtTime(unstakeRequest.secondsLeft)} {c.pos.cooldown}</div>
                    )}
                  </div>
                  <button onClick={withdraw} disabled={txLoading || !unstakeRequest.isUnlocked}
                    style={{
                      padding: '10px 20px', borderRadius: 10, border: 'none', flexShrink: 0,
                      background: unstakeRequest.isUnlocked ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.04)',
                      color: unstakeRequest.isUnlocked ? '#fff' : '#334155',
                      fontSize: 13, fontWeight: 700,
                      cursor: !unstakeRequest.isUnlocked || txLoading ? 'not-allowed' : 'pointer',
                      boxShadow: unstakeRequest.isUnlocked ? '0 4px 14px rgba(5,150,105,0.25)' : 'none',
                    }}>
                    {txLoading ? '...' : unstakeRequest.isUnlocked ? c.pos.withdraw : c.pos.locked}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ── ERROR ── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
                <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STAKE FORM ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '26px 28px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 22, letterSpacing: '-0.2px' }}>{c.form.title}</h2>

          {/* Input */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: 0.5 }}>{c.form.label.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: '#334155' }}>{c.form.balance}: <span style={{ color: '#64748b', fontWeight: 600 }}>{fmt(vendBalance, 0)} VEND</span></span>
            </div>
            <div style={{ position: 'relative' }}>
              <input type="number" value={vendInput} onChange={e => setVendInput(e.target.value)}
                placeholder={c.form.min}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${vendAmt > 0 && vendAmt < MIN_VEND ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 12, padding: '14px 90px 14px 16px',
                  color: '#fff', fontSize: 22, fontWeight: 700, outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(5,150,105,0.5)' }}
                onBlur={e => { e.currentTarget.style.borderColor = vendAmt > 0 && vendAmt < MIN_VEND ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)' }}
              />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setVendInput(String(Math.floor(vendBalance)))}
                  style={{ fontSize: 10, fontWeight: 800, color: '#10b981', background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: 6, padding: '3px 7px', cursor: 'pointer' }}>MAX</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>VEND</span>
              </div>
            </div>
          </div>

          {/* Info row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: c.form.apy,    value: displayApy, accent: '#10b981' },
              { label: c.form.lockup, value: c.form.lockupVal },
              { label: c.form.type,   value: c.form.typeVal },
            ].map(r => (
              <div key={r.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#334155', marginBottom: 4, letterSpacing: 0.3 }}>{r.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: r.accent || '#94a3b8' }}>{r.value}</div>
              </div>
            ))}
          </div>

          {/* Button */}
          <button onClick={handleStake} disabled={!canStake}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: canStake ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.05)',
              color: canStake ? '#fff' : '#334155',
              fontSize: 15, fontWeight: 800,
              cursor: canStake ? 'pointer' : 'not-allowed',
              boxShadow: canStake ? '0 8px 28px rgba(5,150,105,0.32)' : 'none',
              transition: 'all 0.25s',
            }}
            onMouseEnter={e => { if (canStake) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          >
            {txLoading ? c.form.loading : `${c.form.btn} →`}
          </button>
          <p style={{ fontSize: 11, color: '#1e3a2e', textAlign: 'center', marginTop: 10 }}>{c.form.note}</p>
        </motion.div>
      </div>
    </div>
  )
}
