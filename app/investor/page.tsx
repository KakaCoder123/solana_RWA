'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import NavBar from '@/components/NavBar'

type Lang = 'ru' | 'en'

const T = {
  ru: {
    welcome: 'Добро пожаловать',
    title: 'Кабинет инвестора',
    poolShare: 'Ваша доля в пуле',
    stats: {
      balance: 'Баланс токенов',
      pending: 'К выплате',
      earned: 'Всего заработано',
      poolDay: 'Доход пула / день',
      from: 'от',
      machines: 'автоматов',
    },
    claim: {
      label: 'Накопленные награды',
      sub: 'Обновляется с каждой продажей автомата',
      processing: 'Обработка...',
      success: '✅ Получено!',
      btn: '💸 Забрать доход',
    },
    machinesTitle: 'Автоматы в сети',
    machinesOnline: 'онлайн',
    sales: 'продаж',
    liveFeed: 'Live продажи',
    onChain: 'on-chain',
    buyTitle: '💎 Увеличить долю',
    buyLabels: ['Старт', 'Популярный', 'Максимум'],
    buyBtn: 'Купить',
    buyAlert: 'Покупка токенов — интеграция со смарт-контрактом в разработке',
  },
  en: {
    welcome: 'Welcome',
    title: 'Investor Dashboard',
    poolShare: 'Your pool share',
    stats: {
      balance: 'Token balance',
      pending: 'Pending rewards',
      earned: 'Total earned',
      poolDay: 'Pool revenue / day',
      from: 'from',
      machines: 'machines',
    },
    claim: {
      label: 'Accumulated rewards',
      sub: 'Updates with every machine sale',
      processing: 'Processing...',
      success: '✅ Claimed!',
      btn: '💸 Claim revenue',
    },
    machinesTitle: 'Machines online',
    machinesOnline: 'online',
    sales: 'sales',
    liveFeed: 'Live sales',
    onChain: 'on-chain',
    buyTitle: '💎 Increase stake',
    buyLabels: ['Starter', 'Popular', 'Maximum'],
    buyBtn: 'Buy',
    buyAlert: 'Token purchase — smart contract integration in progress',
  },
} as const

// Mock data — will be replaced with real Solana data
const MOCK_MACHINES = [
  { id: 'VM-ALM-001', location: 'Алматы, ул. Абая 10', todayRevenue: 48.20, sales: 142, status: 'online' },
  { id: 'VM-ALM-002', location: 'Алматы, Достык 89', todayRevenue: 51.60, sales: 156, status: 'online' },
  { id: 'VM-ALM-003', location: 'Алматы, Сейфуллина 12', todayRevenue: 42.40, sales: 128, status: 'online' },
]

const MOCK_TRANSACTIONS = [
  { time: '14:32', machine: 'VM-ALM-001', item: 'Coca-Cola 0.5л', amount: 350, currency: '₸' },
  { time: '14:28', machine: 'VM-ALM-002', item: 'Питьевая вода', amount: 200, currency: '₸' },
  { time: '14:21', machine: 'VM-ALM-003', item: 'Lays Краб', amount: 450, currency: '₸' },
  { time: '14:15', machine: 'VM-ALM-001', item: 'Red Bull 0.25л', amount: 600, currency: '₸' },
  { time: '14:08', machine: 'VM-ALM-002', item: 'Sprite 0.5л', amount: 350, currency: '₸' },
  { time: '13:55', machine: 'VM-ALM-003', item: 'Snickers', amount: 380, currency: '₸' },
]

export default function InvestorPage() {
  const { connected, publicKey } = useWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<Lang>('ru')
  const [vendBalance] = useState(500)
  const [pendingRewards, setPendingRewards] = useState(0.0234)
  const [totalEarned, setTotalEarned] = useState(0.1847)
  const [liveTransactions, setLiveTransactions] = useState(MOCK_TRANSACTIONS)
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)

  const c = T[lang]

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && !connected) router.push('/')
  }, [connected, mounted, router])

  useEffect(() => {
    const items = ['Coca-Cola 0.5л', 'Sprite', 'Питьевая вода', 'Red Bull', 'Lays', 'Snickers', 'Twix', 'Bounty']
    const machines = MOCK_MACHINES.map(m => m.id)

    const interval = setInterval(() => {
      const now = new Date()
      const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
      const item = items[Math.floor(Math.random() * items.length)]
      const machine = machines[Math.floor(Math.random() * machines.length)]
      const amount = [200, 350, 380, 450, 500, 600][Math.floor(Math.random() * 6)]

      const newTx = { time, machine, item, amount, currency: '₸' }
      setLiveTransactions(prev => [newTx, ...prev.slice(0, 9)])

      const userShare = vendBalance / 10000
      const txRevenue = amount / 500 * 0.001
      setPendingRewards(prev => +(prev + txRevenue * userShare).toFixed(6))
    }, 4000)

    return () => clearInterval(interval)
  }, [vendBalance])

  const handleClaim = async () => {
    setClaiming(true)
    await new Promise(res => setTimeout(res, 2000))
    setTotalEarned(prev => +(prev + pendingRewards).toFixed(6))
    setPendingRewards(0)
    setClaiming(false)
    setClaimSuccess(true)
    setTimeout(() => setClaimSuccess(false), 3000)
  }

  const totalPoolRevenue = MOCK_MACHINES.reduce((s, m) => s + m.todayRevenue, 0)
  const userShare = ((vendBalance / 10000) * 100).toFixed(1)

  if (!mounted || !connected) return null

  const BUY_PKGS = [
    { amount: 100, sol: 0.072, color: '#9945FF' },
    { amount: 500, sol: 0.35, color: '#14F195' },
    { amount: 1000, sol: 0.68, color: '#00C2FF' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <NavBar lang={lang} onToggleLang={() => setLang(l => l === 'ru' ? 'en' : 'ru')} />

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">

        {/* Welcome Banner */}
        <div className="glass-purple rounded-3xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#9945FF] font-semibold mb-1 uppercase tracking-wider">{c.welcome}</div>
            <h1 className="text-2xl font-black mb-1">{c.title}</h1>
            <p className="text-gray-400 text-sm font-mono">{publicKey?.toString()}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">{c.poolShare}</div>
            <div className="text-4xl font-black gradient-text">{userShare}%</div>
            <div className="text-sm text-gray-500">{vendBalance} / 10,000 VEND</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: c.stats.balance, value: `${vendBalance} VEND`, sub: `≈ $${(vendBalance * 0.1).toFixed(2)}`, color: '#9945FF' },
            { label: c.stats.pending, value: `${pendingRewards.toFixed(6)} SOL`, sub: `≈ $${(pendingRewards * 140).toFixed(4)}`, color: '#14F195' },
            { label: c.stats.earned, value: `${totalEarned.toFixed(4)} SOL`, sub: `≈ $${(totalEarned * 140).toFixed(2)}`, color: '#00C2FF' },
            { label: c.stats.poolDay, value: `$${totalPoolRevenue.toFixed(2)}`, sub: `${c.stats.from} ${MOCK_MACHINES.length} ${c.stats.machines}`, color: '#FFB800' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-500 mb-2">{stat.label}</div>
              <div className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-gray-600 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Claim Rewards */}
        <div className="glass rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <div className="text-sm text-gray-400 mb-1">{c.claim.label}</div>
            <div className="text-3xl font-black text-[#14F195]">{pendingRewards.toFixed(6)} SOL</div>
            <div className="text-xs text-gray-600 mt-1">{c.claim.sub}</div>
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming || pendingRewards === 0}
            className={`btn-primary px-8 py-4 text-lg min-w-[180px] ${(claiming || pendingRewards === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {claiming ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {c.claim.processing}
              </span>
            ) : claimSuccess ? c.claim.success : c.claim.btn}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">

          {/* Machines Status */}
          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-black mb-5 flex items-center gap-2">
              🏧 <span>{c.machinesTitle}</span>
              <span className="ml-auto text-xs glass px-2 py-1 rounded-full text-[#14F195]">{MOCK_MACHINES.length} {c.machinesOnline}</span>
            </h2>
            <div className="space-y-3">
              {MOCK_MACHINES.map((m) => (
                <div key={m.id} className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-2xl">🏧</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{m.id}</div>
                    <div className="text-xs text-gray-500 truncate">{m.location}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[#14F195] font-bold text-sm">+${m.todayRevenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">{m.sales} {c.sales}</div>
                  </div>
                  <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Live Sales Feed */}
          <div className="glass rounded-3xl p-6">
            <h2 className="text-lg font-black mb-5 flex items-center gap-2">
              ⚡ <span>{c.liveFeed}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-[#14F195]">
                <span className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse" />
                {c.onChain}
              </span>
            </h2>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {liveTransactions.map((tx, i) => (
                <div
                  key={i}
                  className={`glass rounded-xl p-3 flex items-center gap-3 text-sm transition-all ${i === 0 ? 'border-[#14F195]/30 bg-[#14F195]/5' : ''}`}
                >
                  <span className="text-gray-600 font-mono text-xs flex-shrink-0">{tx.time}</span>
                  <span className="text-xs text-[#9945FF] flex-shrink-0 font-mono">{tx.machine}</span>
                  <span className="text-gray-300 flex-1 truncate">{tx.item}</span>
                  <span className="text-[#14F195] font-bold flex-shrink-0">{tx.amount}{tx.currency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Buy More Tokens */}
        <div className="glass rounded-3xl p-6">
          <h2 className="text-lg font-black mb-5">{c.buyTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {BUY_PKGS.map((pkg, i) => (
              <div key={pkg.amount} className="glass rounded-2xl p-5 text-center hover:border-[#9945FF]/40 transition-all cursor-pointer group">
                <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: pkg.color }}>{c.buyLabels[i]}</div>
                <div className="text-3xl font-black mb-1">{pkg.amount} <span className="text-lg">VEND</span></div>
                <div className="text-gray-400 text-sm mb-4">{pkg.sol} SOL ≈ ${(pkg.sol * 140).toFixed(0)}</div>
                <button
                  className="btn-primary w-full py-2.5 text-sm group-hover:opacity-90"
                  onClick={() => alert(c.buyAlert)}
                >
                  {c.buyBtn}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
