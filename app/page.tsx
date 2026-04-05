'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'

type Lang = 'ru' | 'en'

// ─────────────────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────────────────
const T = {
  ru: {
    nav: { how: 'Как работает', feat: 'Возможности', faq: 'FAQ', cta: 'Войти в платформу', open: 'Мой кабинет', net: 'Solana Devnet' },
    hero: {
      badge: 'RWA · Solana · Real Yield',
      h1: ['Инвестируй в сеть', 'вендинговых автоматов'],
      accent: 'и зарабатывай каждый день',
      p: 'VendChain — первая платформа токенизации реальных активов на Solana. Купи долю в пуле физических машин от ',
      pBold: '$10',
      p2: ' и получай доход с каждой продажи автоматически.',
      cta1: 'Войти в платформу',
      cta2: 'Как это работает',
      trust: ['Solana Foundation', 'SPV Structure', 'On-chain Audit'],
      card: { label: 'Доход пула сегодня', value: '$142.30', sub: '↑ 12% к вчера', live: 'Live' },
    },
    ticker: [
      'VM-ALM-001 · Coca-Cola 0.5л · +350₸',
      'VM-ALM-002 · Питьевая вода · +200₸',
      'Выплата: 0.0012 SOL → 28 держателям',
      'VM-ALM-003 · Lays Краб · +450₸',
      'Новый инвестор · 500 VEND куплено',
      'VM-ALM-001 · Red Bull · +600₸',
      'Выплата: 0.0021 SOL → 28 держателям',
      'VM-ALM-002 · Snickers · +380₸',
    ],
    stats: [
      { v: '500+', l: 'Планируется автоматов' },
      { v: '$142', l: 'Доход за 24ч' },
      { v: '18.4%', l: 'Годовая доходность' },
      { v: '28', l: 'Инвесторов' },
    ],
    how: {
      tag: 'Как это работает',
      h: 'Три шага до пассивного дохода',
      p: 'От подключения кошелька до ежедневных выплат — без банков и посредников',
      steps: [
        { n: '01', t: 'Подключи кошелёк', d: 'Войди через Phantom, Solflare или Backpack. Никакой регистрации — только подпись транзакции.' },
        { n: '02', t: 'Купи долю в пуле', d: 'Приобрети VEND-токены. Каждый токен закрепляет право на долю дохода всей сети автоматов.' },
        { n: '03', t: 'Получай доход', d: 'Смарт-контракт автоматически распределяет выручку. Забирай накопленное в любое время.' },
      ],
    },
    earn: {
      tag: 'Два способа зарабатывать',
      h: 'Инвестируй или стейкай — выбор за тобой',
      p: 'Гибкая система доходности для любой инвестиционной стратегии',
      cards: [
        {
          accentColor: '#10b981',
          accentBg: 'rgba(16,185,129,0.06)',
          accentBorder: 'rgba(16,185,129,0.2)',
          tag: 'Инвестирование',
          t: 'Стань совладельцем сети',
          d: 'Купи VEND-токены и получай долю от каждой продажи в сети автоматов. Доход начисляется пропорционально количеству токенов.',
          rows: [['Мин. инвестиция', '$10'], ['Частота выплат', 'Ежедневно'], ['Тип дохода', 'Revenue share']],
          btn: 'Купить VEND →',
          href: '/trade',
        },
        {
          accentColor: '#818cf8',
          accentBg: 'rgba(99,102,241,0.06)',
          accentBorder: 'rgba(99,102,241,0.2)',
          tag: 'Стейкинг',
          t: 'Зарабатывай на стейкинге',
          d: 'Заблокируй VEND-токены в смарт-контракте и получай 18.4% годовых. Чем дольше держишь — тем больше зарабатываешь.',
          rows: [['Базовый APY', '18.4%'], ['Lockup период', '7 дней'], ['Тип дохода', 'Staking reward']],
          btn: 'Начать стейкинг →',
          href: '/staking',
        },
      ],
    },
    features: {
      tag: 'Возможности',
      h: 'Возможности платформы',
      p: 'Полная инфраструктура для инвестирования в реальные активы через блокчейн',
      items: [
        { icon: '◈', t: 'Токенизация активов', d: 'Каждый VEND-токен закреплён за реальным пулом вендинговых автоматов. Юридически оформленная долевая собственность через SPV.' },
        { icon: '⟳', t: 'Автоматические выплаты', d: 'Смарт-контракт Solana распределяет доход от продаж пропорционально токенам. Без посредников, без задержек.' },
        { icon: '◎', t: 'On-chain прозрачность', d: 'Каждая транзакция от продажи до выплаты записана в блокчейне. Проверяй через Solana Explorer.' },
        { icon: '⬡', t: 'Вторичный рынок', d: 'Продай долю в любой момент. Ликвидность обеспечивается через торговлю VEND-токенами между участниками.' },
        { icon: '⊕', t: 'Низкий порог входа', d: 'Начни с любой суммы от $10. Диверсификация по пулу автоматов снижает риски отдельной точки.' },
        { icon: '⚙', t: 'IoT + Oracle интеграция', d: 'Автоматы передают данные о продажах через оракул в смарт-контракт. Данные верифицируются через платёжные системы.' },
      ],
    },
    about: {
      tag: 'О нас',
      h: 'О платформе VendChain',
      p1: 'VendChain — инфраструктура для токенизации физических активов на блокчейне Solana. Мы начали с вендинговых автоматов как понятного и предсказуемого актива с ежедневным cashflow.',
      p2: 'Наша миссия — открыть доступ к реальным инвестициям для любого человека с суммой от $10, сохранив полную прозрачность через блокчейн.',
      rows: [['100%', 'On-chain операции'], ['< $0.01', 'Комиссия за выплату'], ['Ежедневно', 'Частота выплат'], ['SPV', 'Юридическая структура']],
      btn: 'Начать инвестировать',
    },
    cta: {
      h: 'Готов начать?',
      p: 'Подключи кошелёк и войди в платформу за 30 секунд. Поддерживаются Phantom, Solflare и Backpack.',
      b1: 'Войти в платформу',
      b2: 'Узнать больше',
      wallets: 'Phantom · Solflare · Backpack',
    },
    faq: {
      tag: 'FAQ',
      h: 'Частые вопросы',
      p: 'Всё что нужно знать перед первой инвестицией',
      items: [
        { q: 'Что обеспечивает ценность VEND-токена?', a: 'Каждый токен юридически привязан к пулу вендинговых автоматов через SPV-структуру. Держатель токена имеет право на долю дохода пропорционально своей доле.' },
        { q: 'Как часто выплачивается доход?', a: 'Смарт-контракт накапливает доход с каждой продажи. Вы можете забрать накопленное в любое время — комиссия Solana составляет менее $0.01.' },
        { q: 'Что происходит при добавлении новых автоматов?', a: 'Доход новых машин автоматически добавляется в общий пул. Держатели существующих токенов получают выгоду без необходимости покупать новые токены.' },
        { q: 'Можно ли продать токены?', a: 'Да, VEND-токены торгуются на вторичном рынке между участниками платформы. Ликвидность обеспечивается через Solana.' },
        { q: 'Нужна ли верификация личности (KYC)?', a: 'Для входа нужен только криптокошелёк. Никаких форм, email-регистрации или документов. Всё управляется on-chain.' },
        { q: 'Какие кошельки поддерживаются?', a: 'Phantom, Solflare и Backpack. Все три работают на Solana и поддерживают подпись транзакций без передачи приватного ключа.' },
      ],
    },
    why: {
      tag: 'Преимущества',
      h: 'Почему выбирают',
      accent: 'VendChain?',
      items: [
        {
          title: 'Реальный ежедневный доход',
          desc: 'Каждая продажа из автомата мгновенно поступает в пул. Ты зарабатываешь пассивно каждый день без участия в операциях.',
          icon: 'revenue',
        },
        {
          title: 'Вход от $10 без KYC',
          desc: 'Никаких банков, форм или верификации. Только кошелёк — и ты уже совладелец сети вендинговых автоматов.',
          icon: 'access',
        },
        {
          title: 'On-chain прозрачность',
          desc: 'Каждая транзакция записана в блокчейне Solana. Проверяй баланс и историю выплат в любое время без доверия к посреднику.',
          icon: 'chain',
        },
        {
          title: 'Скорость и дешевизна Solana',
          desc: '400 миллисекунд на финализацию, менее $0.01 за выплату. Единственная сеть, где маржинальна даже $2 продажа.',
          icon: 'speed',
        },
      ],
    },
    footer: { built: 'Built on Solana · Hackathon 2026 · Decentrathon', links: ['GitHub', 'Docs', 'Twitter'] },
  },

  en: {
    nav: { how: 'How it works', feat: 'Features', faq: 'FAQ', cta: 'Enter platform', open: 'Dashboard', net: 'Solana Devnet' },
    hero: {
      badge: 'RWA · Solana · Real Yield',
      h1: ['Invest in a network of', 'vending machines'],
      accent: 'and earn every single day',
      p: 'VendChain is the first RWA tokenization platform on Solana. Buy a share in a pool of physical machines from ',
      pBold: '$10',
      p2: ' and receive revenue from every sale automatically.',
      cta1: 'Enter platform',
      cta2: 'How it works',
      trust: ['Solana Foundation', 'SPV Structure', 'On-chain Audit'],
      card: { label: 'Pool revenue today', value: '$142.30', sub: '↑ 12% vs yesterday', live: 'Live' },
    },
    ticker: [
      'VM-ALM-001 · Coca-Cola 0.5L · +350₸',
      'VM-ALM-002 · Water · +200₸',
      'Payout: 0.0012 SOL → 28 holders',
      'VM-ALM-003 · Lays Crab · +450₸',
      'New investor · 500 VEND purchased',
      'VM-ALM-001 · Red Bull · +600₸',
      'Payout: 0.0021 SOL → 28 holders',
      'VM-ALM-002 · Snickers · +380₸',
    ],
    stats: [
      { v: '500+', l: 'Machines planned' },
      { v: '$142', l: '24h revenue' },
      { v: '18.4%', l: 'Annual yield' },
      { v: '28', l: 'Investors' },
    ],
    how: {
      tag: 'How it works',
      h: 'Three steps to passive income',
      p: 'From wallet connection to daily payouts — without banks or intermediaries',
      steps: [
        { n: '01', t: 'Connect your wallet', d: 'Sign in with Phantom, Solflare or Backpack. No registration — just sign a transaction.' },
        { n: '02', t: 'Buy a pool share', d: 'Purchase VEND tokens. Each token establishes your right to a share of the network\'s total revenue.' },
        { n: '03', t: 'Earn revenue', d: 'Smart contracts automatically distribute earnings. Withdraw your accrued income at any time.' },
      ],
    },
    earn: {
      tag: 'Two ways to earn',
      h: 'Invest or stake — your choice',
      p: 'Flexible yield system for any investment strategy',
      cards: [
        {
          accentColor: '#10b981',
          accentBg: 'rgba(16,185,129,0.06)',
          accentBorder: 'rgba(16,185,129,0.2)',
          tag: 'Investing',
          t: 'Become a co-owner',
          d: 'Buy VEND tokens and receive a share of every sale across the machine network. Revenue is distributed proportionally to your token holdings.',
          rows: [['Min. investment', '$10'], ['Payout frequency', 'Daily'], ['Income type', 'Revenue share']],
          btn: 'Buy VEND →',
          href: '/trade',
        },
        {
          accentColor: '#818cf8',
          accentBg: 'rgba(99,102,241,0.06)',
          accentBorder: 'rgba(99,102,241,0.2)',
          tag: 'Staking',
          t: 'Earn staking rewards',
          d: 'Lock VEND tokens in a smart contract and earn 18.4% annual yield. The longer you hold — the more you earn.',
          rows: [['Base APY', '18.4%'], ['Lock period', '7 days'], ['Income type', 'Staking reward']],
          btn: 'Start staking →',
          href: '/staking',
        },
      ],
    },
    features: {
      tag: 'Features',
      h: 'Platform features',
      p: 'Full infrastructure for investing in real assets through blockchain',
      items: [
        { icon: '◈', t: 'Asset tokenization', d: 'Each VEND token is backed by a real pool of vending machines. Legally structured fractional ownership via SPV.' },
        { icon: '⟳', t: 'Automatic payouts', d: 'Solana smart contracts distribute revenue from sales proportionally. No intermediaries, no delays.' },
        { icon: '◎', t: 'On-chain transparency', d: 'Every transaction from sale to payout is recorded on blockchain. Verify at any time via Solana Explorer.' },
        { icon: '⬡', t: 'Secondary market', d: 'Sell your share at any time. Liquidity is provided through VEND token trading between participants.' },
        { icon: '⊕', t: 'Low entry barrier', d: 'Start with any amount from $10. Diversification across the machine pool reduces individual point risks.' },
        { icon: '⚙', t: 'IoT + Oracle integration', d: 'Machines transmit sales data via oracle to smart contracts. Data is verified through payment systems.' },
      ],
    },
    about: {
      tag: 'About',
      h: 'About VendChain',
      p1: 'VendChain is an infrastructure for tokenizing physical assets on the Solana blockchain. We started with vending machines as a clear and predictable asset with daily cashflow.',
      p2: 'Our mission is to open access to real investments for anyone with as little as $10, while maintaining full transparency through blockchain.',
      rows: [['100%', 'On-chain operations'], ['< $0.01', 'Payout fee'], ['Daily', 'Payout frequency'], ['SPV', 'Legal structure']],
      btn: 'Start investing',
    },
    cta: {
      h: 'Ready to start?',
      p: 'Connect your wallet and enter the platform in 30 seconds. Phantom, Solflare and Backpack supported.',
      b1: 'Enter platform',
      b2: 'Learn more',
      wallets: 'Phantom · Solflare · Backpack',
    },
    faq: {
      tag: 'FAQ',
      h: 'Frequently asked questions',
      p: 'Everything you need to know before your first investment',
      items: [
        { q: 'What backs the value of VEND token?', a: 'Each token is legally tied to a pool of vending machines through an SPV structure. Token holders have the right to a proportional share of revenue.' },
        { q: 'How often is income paid out?', a: 'The smart contract accumulates revenue from each sale. You can withdraw accrued amounts at any time — Solana fees are less than $0.01.' },
        { q: 'What happens when new machines are added?', a: 'Revenue from new machines is automatically added to the general pool. Existing token holders benefit without needing to buy new tokens.' },
        { q: 'Can I sell tokens?', a: 'Yes, VEND tokens are traded on the secondary market between platform participants. Liquidity is provided through Solana.' },
        { q: 'Is identity verification (KYC) required?', a: 'All you need is a crypto wallet. No forms, email registration, or documents required. Everything is managed on-chain.' },
        { q: 'Which wallets are supported?', a: 'Phantom, Solflare and Backpack. All three work on Solana and support transaction signing without revealing your private key.' },
      ],
    },
    why: {
      tag: 'Why us',
      h: 'Why choose',
      accent: 'VendChain?',
      items: [
        {
          title: 'Real daily income',
          desc: 'Every vending machine sale flows into the pool instantly. You earn passively every day with no operational involvement.',
          icon: 'revenue',
        },
        {
          title: 'Entry from $10, no KYC',
          desc: 'No banks, forms, or verification. Just a wallet — and you\'re already a co-owner of the vending machine network.',
          icon: 'access',
        },
        {
          title: 'On-chain transparency',
          desc: 'Every transaction is recorded on Solana blockchain. Check your balance and payout history at any time — no trust required.',
          icon: 'chain',
        },
        {
          title: 'Solana speed & low fees',
          desc: '400ms finalization, less than $0.01 per payout. The only network where even a $2 sale is profitable for all parties.',
          icon: 'speed',
        },
      ],
    },
    footer: { built: 'Built on Solana · Hackathon 2026 · Decentrathon', links: ['GitHub', 'Docs', 'Twitter'] },
  },
} as const

// ─────────────────────────────────────────────────────────────────────
// ANIMATION HELPERS
// ─────────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' as const } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const cardAnim = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

// ─────────────────────────────────────────────────────────────────────
// FAQ ITEM
// ─────────────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      variants={cardAnim}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${open ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.3s',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
          padding: '20px 24px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4 }}>{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ color: '#10b981', fontSize: 22, fontWeight: 300, flexShrink: 0, lineHeight: 1 }}
        >+</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div style={{ padding: '0 24px 20px', color: '#64748b', fontSize: 14, lineHeight: 1.8 }}>
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// WHY ICONS
// ─────────────────────────────────────────────────────────────────────
const whyIcons: Record<string, React.ReactNode> = {
  revenue: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="28" width="7" height="10" rx="1.5"/>
      <rect x="18" y="20" width="7" height="18" rx="1.5"/>
      <rect x="30" y="12" width="7" height="26" rx="1.5"/>
      <path d="M8 20 L16 14 L24 18 L38 8" strokeWidth="1.4"/>
      <circle cx="38" cy="8" r="2" fill="#10b981" stroke="none"/>
    </svg>
  ),
  access: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="22" r="9"/>
      <path d="M27 22 L38 22"/>
      <path d="M34 18 L38 22 L34 26"/>
      <circle cx="18" cy="22" r="3.5" fill="#10b981" fillOpacity="0.2"/>
    </svg>
  ),
  chain: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22 C10 14 34 14 38 22 C34 30 10 30 6 22Z"/>
      <circle cx="22" cy="22" r="5"/>
      <circle cx="22" cy="22" r="2" fill="#10b981" fillOpacity="0.25"/>
      <path d="M17 22 H10 M27 22 H34" strokeWidth="1"/>
    </svg>
  ),
  speed: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 6 L16 22 H24 L18 38 L34 18 H25 L26 6Z" fill="#10b981" fillOpacity="0.1"/>
      <path d="M26 6 L16 22 H24 L18 38 L34 18 H25 L26 6Z"/>
    </svg>
  ),
}

// ─────────────────────────────────────────────────────────────────────
// REVENUE VISUAL (replaces photo in About section)
// ─────────────────────────────────────────────────────────────────────
function RevenueVisual() {
  const bars = [62, 78, 54, 91, 68, 84, 100, 73, 88, 95, 79, 83]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 20,
      padding: '28px',
      position: 'relative',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180,
        background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4, letterSpacing: 0.5 }}>ДОХОД СЕТИ (30 дн.)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>$4,267</div>
        </div>
        <div style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 8, padding: '4px 10px',
          fontSize: 12, color: '#10b981', fontWeight: 600,
        }}>↑ 18.4% APY</div>
      </div>

      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 20 }}>
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
            style={{
              flex: 1,
              background: i === bars.length - 1
                ? 'linear-gradient(180deg, #10b981, #059669)'
                : 'rgba(16,185,129,0.25)',
              borderRadius: '4px 4px 0 0',
            }}
          />
        ))}
      </div>

      {/* Machines row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { id: 'ALM-001', rev: '+₸3,200', status: 'active' },
          { id: 'ALM-002', rev: '+₸2,800', status: 'active' },
          { id: 'ALM-003', rev: '+₸2,100', status: 'active' },
        ].map(m => (
          <div key={m.id} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>VM-{m.id}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{m.rev}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span className="pulse-dot" style={{ width: 5, height: 5, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#475569' }}>Online</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floating badge */}
      <div className="float" style={{
        position: 'absolute', bottom: -16, right: -16,
        background: 'linear-gradient(135deg, #059669, #10b981)',
        borderRadius: 14, padding: '14px 20px',
        boxShadow: '0 16px 40px rgba(16,185,129,0.35)',
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>$142 / день</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Средний доход пула</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { connected } = useWallet()
  const { setVisible } = useWalletModal()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [lang, setLang] = useState<Lang>('ru')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (connected && mounted) router.push('/profile')
  }, [connected, mounted, router])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const c = T[lang]
  const openWallet = () => setVisible(true)

  return (
    <div style={{ background: '#07080d', minHeight: '100vh', color: '#f1f5f9', overflowX: 'hidden' }}>

      {/* ════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%',
        background: scrolled ? 'rgba(7,8,13,0.88)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.35s ease',
      }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.svg" alt="VendChain" width={32} height={32} />
          <span style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.2px' }}>VendChain</span>
        </a>

        {/* Center nav */}
        {mounted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {[
              { label: c.nav.how, href: '#how' },
              { label: c.nav.feat, href: '#features' },
              { label: c.nav.faq, href: '#faq' },
            ].map(l => (
              <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
            ))}
          </div>
        )}

        {/* Right */}
        {mounted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Network badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: '#475569',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 100, padding: '5px 12px',
            }}>
              <span className="pulse-dot" style={{ width: 5, height: 5, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
              {c.nav.net}
            </div>

            {/* Lang toggle */}
            <button
              onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '6px 12px',
                color: '#64748b', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                letterSpacing: 0.5,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>

            <button onClick={openWallet} className="btn btn-cta">
              {connected ? c.nav.open : c.nav.cta}
            </button>
          </div>
        )}
      </nav>

      {/* ════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        {/* Mesh background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 30% 0%, rgba(16,185,129,0.1) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 50%),
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: 'auto, auto, 56px 56px, 56px 56px',
        }} />

        {/* Bottom fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
          background: 'linear-gradient(to bottom, transparent, #07080d)',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '120px 5% 80px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center',
          position: 'relative', zIndex: 2, width: '100%',
        }}>
          {/* Left: text */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="section-tag" style={{ marginBottom: 28 }}>
                <span className="pulse-dot" style={{ width: 5, height: 5, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                {c.hero.badge}
              </div>
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              style={{
                fontSize: 'clamp(36px, 4.5vw, 58px)',
                fontWeight: 800,
                lineHeight: 1.07,
                letterSpacing: '-2px',
                marginBottom: 24,
              }}
            >
              {c.hero.h1[0]}<br />
              {c.hero.h1[1]}<br />
              <span className="grad">{c.hero.accent}</span>
            </motion.h1>

            {/* Paragraph */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              style={{ fontSize: 16, color: '#64748b', lineHeight: 1.8, marginBottom: 40, maxWidth: 500 }}
            >
              {c.hero.p}<strong style={{ color: '#10b981' }}>{c.hero.pBold}</strong>{c.hero.p2}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 44 }}
            >
              <button onClick={openWallet} className="btn btn-emerald" style={{ padding: '14px 32px', fontSize: 15 }}>
                {c.hero.cta1} →
              </button>
              <a href="#how" className="btn btn-outline" style={{ padding: '13px 28px', fontSize: 15 }}>
                {c.hero.cta2}
              </a>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}
            >
              {c.hero.trust.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                  <span style={{ color: '#10b981', fontSize: 13 }}>✓</span> {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: floating stats card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="float"
            style={{
              background: 'rgba(255,255,255,0.028)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 24,
              padding: '32px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Glow inside card */}
            <div style={{
              position: 'absolute', top: -30, right: -30,
              width: 160, height: 160,
              background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: '#475569', letterSpacing: 0.5 }}>{c.hero.card.label}</span>
              <span style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 100, padding: '2px 9px',
                fontSize: 10, color: '#10b981', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span className="pulse-dot" style={{ width: 4, height: 4, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                {c.hero.card.live}
              </span>
            </div>

            <div style={{ fontSize: 42, fontWeight: 800, color: '#10b981', letterSpacing: '-1px', marginBottom: 6 }}>
              {c.hero.card.value}
            </div>
            <div style={{ fontSize: 13, color: '#10b981', opacity: 0.7, marginBottom: 28 }}>{c.hero.card.sub}</div>

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { l: 'Автоматов', v: '3' },
                { l: 'Инвесторов', v: '28' },
                { l: 'APY', v: '18.4%' },
                { l: 'Комиссия', v: '< $0.01' },
              ].map(s => (
                <div key={s.l} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Bar sparkline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
              {[40, 65, 45, 80, 60, 90, 70, 95, 75, 88].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: 0.8 + i * 0.04 }}
                  style={{
                    flex: 1,
                    background: i === 9
                      ? 'linear-gradient(180deg, #10b981, #059669)'
                      : 'rgba(16,185,129,0.2)',
                    borderRadius: '3px 3px 0 0',
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TICKER
      ════════════════════════════════════════════ */}
      <div style={{
        background: '#05060b',
        borderTop: '1px solid rgba(16,185,129,0.12)',
        borderBottom: '1px solid rgba(16,185,129,0.12)',
        padding: '10px 0', overflow: 'hidden',
      }}>
        <div className="ticker" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          {[...c.ticker, ...c.ticker].map((t, i) => (
            <span key={i} style={{ padding: '0 48px', fontSize: 12, color: '#334155', fontFamily: 'monospace', letterSpacing: 0.3 }}>
              <span style={{ color: '#10b981', marginRight: 10 }}>◆</span>{t}
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          STATS
      ════════════════════════════════════════════ */}
      <section style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{
            maxWidth: 1100, margin: '0 auto', padding: '0 5%',
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          }}
        >
          {c.stats.map((s, i) => (
            <motion.div
              key={i}
              variants={cardAnim}
              style={{
                textAlign: 'center', padding: '44px 20px',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                position: 'relative',
              }}
            >
              <div style={{
                fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px',
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: 8,
              }}>{s.v}</div>
              <div style={{ fontSize: 13, color: '#475569', letterSpacing: 0.3 }}>{s.l}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════ */}
      <section id="how" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* BG */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 60%),
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: 'auto, 56px 56px, 56px 56px',
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '112px 5%', position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            style={{ textAlign: 'center', marginBottom: 72 }}
          >
            <div className="section-tag" style={{ display: 'inline-flex' }}>{c.how.tag}</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
              {c.how.h}
            </h2>
            <p style={{ color: '#475569', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
              {c.how.p}
            </p>
          </motion.div>

          {/* Steps */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, position: 'relative' }}
          >
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              top: 44, left: '16%', right: '16%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), rgba(99,102,241,0.3), transparent)',
              pointerEvents: 'none',
            }} />

            {c.how.steps.map((s, i) => (
              <motion.div
                key={i}
                variants={cardAnim}
                whileHover={{ y: -6 }}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 18,
                  padding: '36px 30px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                {/* Step number bg */}
                <div style={{
                  position: 'absolute', top: 16, right: 20,
                  fontSize: 72, fontWeight: 900, color: '#10b981',
                  opacity: 0.05, lineHeight: 1, userSelect: 'none',
                }}>{s.n}</div>

                {/* Step circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10b981', fontWeight: 800, fontSize: 14,
                  marginBottom: 24,
                }}>{s.n}</div>

                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#f1f5f9' }}>{s.t}</h3>
                <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.8 }}>{s.d}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TWO WAYS TO EARN (legasi.io "two solutions" style)
      ════════════════════════════════════════════ */}
      <section style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'linear-gradient(180deg, #050608 0%, #07080d 100%)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '112px 5%' }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >
            <div className="section-tag" style={{ display: 'inline-flex' }}>{c.earn.tag}</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
              {c.earn.h}
            </h2>
            <p style={{ color: '#475569', fontSize: 15, maxWidth: 440, margin: '0 auto', lineHeight: 1.75 }}>
              {c.earn.p}
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
          >
            {c.earn.cards.map((card, i) => (
              <motion.div
                key={i}
                variants={cardAnim}
                whileHover={{ y: -6 }}
                style={{
                  background: card.accentBg,
                  border: `1px solid ${card.accentBorder}`,
                  borderRadius: 20,
                  padding: '40px 36px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.3s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px ${card.accentColor}18` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              >
                {/* Glow */}
                <div style={{
                  position: 'absolute', top: -40, right: -40,
                  width: 200, height: 200,
                  background: `radial-gradient(circle, ${card.accentColor}18 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                {/* Tag */}
                <div style={{
                  display: 'inline-block',
                  background: `${card.accentColor}15`,
                  border: `1px solid ${card.accentColor}35`,
                  borderRadius: 100, padding: '4px 12px',
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  color: card.accentColor, marginBottom: 20,
                  textTransform: 'uppercase' as const,
                }}>{card.tag}</div>

                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginBottom: 14, letterSpacing: '-0.5px' }}>
                  {card.t}
                </h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
                  {card.d}
                </p>

                {/* Stats rows */}
                <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {card.rows.map(([l, v]) => (
                    <div key={l} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 10,
                    }}>
                      <span style={{ fontSize: 13, color: '#475569' }}>{l}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: card.accentColor }}>{v}</span>
                    </div>
                  ))}
                </div>

                <a href={card.href} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: `linear-gradient(135deg, ${card.accentColor}cc, ${card.accentColor})`,
                  color: '#fff', borderRadius: 10,
                  padding: '12px 24px', fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 28px ${card.accentColor}40` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '' }}
                >{card.btn}</a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════ */}
      <section id="features" style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(99,102,241,0.06) 0%, transparent 55%)',
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '112px 5%', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            style={{ marginBottom: 60 }}
          >
            <div className="section-tag">{c.features.tag}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 10 }}>
                  {c.features.h}
                </h2>
                <p style={{ color: '#475569', fontSize: 15, maxWidth: 440, lineHeight: 1.7 }}>{c.features.p}</p>
              </div>
              <a href="#faq" className="btn btn-outline" style={{ fontSize: 13, padding: '9px 20px' }}>
                FAQ →
              </a>
            </div>
          </motion.div>

          <motion.div
            key={lang}
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}
          >
            {c.features.items.map(f => (
              <motion.div
                key={f.t}
                variants={cardAnim}
                whileHover={{ y: -5 }}
                className="card"
                style={{ padding: '28px 26px', display: 'flex', gap: 18 }}
              >
                <div className="icon-em" style={{ flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>{f.t}</h3>
                  <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.8 }}>{f.d}</p>
                  <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 12, marginTop: 12, textDecoration: 'none', fontWeight: 600 }}>
                    {lang === 'ru' ? 'Подробнее' : 'Learn more'} →
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WHY VENDCHAIN
      ════════════════════════════════════════════ */}
      <section style={{
        background: '#05060b',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '112px 5%' }}>
          {/* Header */}
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            style={{ marginBottom: 64 }}
          >
            <div className="section-tag">{c.why.tag}</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1 }}>
              {c.why.h}{' '}
              <span className="grad">{c.why.accent}</span>
            </h2>
          </motion.div>

          {/* 2-column staggered card grid */}
          <motion.div
            key={lang + '-why'}
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            {c.why.items.map((item, i) => (
              <motion.div
                key={item.icon}
                variants={cardAnim}
                whileHover={{ y: -6 }}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 18,
                  padding: '36px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  marginTop: i % 2 === 1 ? 40 : 0,
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(16,185,129,0.3)'
                  el.style.boxShadow = '0 16px 48px rgba(16,185,129,0.08)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(255,255,255,0.06)'
                  el.style.boxShadow = 'none'
                }}
              >
                {/* Icon box */}
                <div style={{
                  width: 64, height: 64,
                  borderRadius: 16,
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {whyIcons[item.icon]}
                </div>

                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, letterSpacing: '-0.3px' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.85 }}>
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          ABOUT
      ════════════════════════════════════════════ */}
      <section id="about" style={{
        background: '#05060b',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '112px 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
            {/* Visual */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ paddingBottom: 44, paddingRight: 32 }}
            >
              <RevenueVisual />
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            >
              <div className="section-tag">{c.about.tag}</div>
              <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 20, lineHeight: 1.2 }}>
                {c.about.h}
              </h2>
              <p style={{ color: '#64748b', lineHeight: 1.85, marginBottom: 16, fontSize: 15 }}>{c.about.p1}</p>
              <p style={{ color: '#64748b', lineHeight: 1.85, marginBottom: 32, fontSize: 15 }}>{c.about.p2}</p>

              {/* Metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36 }}>
                {c.about.rows.map(([v, l]) => (
                  <div key={l} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#10b981' }}>{v}</div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>

              <button onClick={openWallet} className="btn btn-emerald" style={{ padding: '13px 28px' }}>
                {c.about.btn} →
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #052818 0%, #071c14 40%, #070d1a 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(ellipse 60% 80% at 20% 50%, rgba(16,185,129,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 40% 60% at 80% 50%, rgba(99,102,241,0.1) 0%, transparent 50%)
          `,
        }} />

        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fadeUp}
          style={{
            maxWidth: 720, margin: '0 auto',
            padding: '96px 5%',
            textAlign: 'center',
            position: 'relative', zIndex: 1,
          }}
        >
          <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
            {c.cta.h}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 40, lineHeight: 1.75, maxWidth: 480, margin: '0 auto 40px' }}>
            {c.cta.p}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={openWallet} className="btn btn-white" style={{ padding: '14px 32px', fontSize: 15 }}>
              {c.cta.b1} →
            </button>
            <a href="#how" className="btn btn-outline" style={{ padding: '13px 28px', fontSize: 15 }}>
              {c.cta.b2}
            </a>
          </div>
          <p style={{ color: '#1e4d39', fontSize: 12, marginTop: 24 }}>{c.cta.wallets}</p>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          FAQ
      ════════════════════════════════════════════ */}
      <section id="faq" style={{
        background: 'linear-gradient(180deg, #05060b 0%, #07080d 100%)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '112px 5%' }}>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp}
            style={{ textAlign: 'center', marginBottom: 60 }}
          >
            <div className="section-tag" style={{ display: 'inline-flex' }}>{c.faq.tag}</div>
            <h2 style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 14 }}>
              {c.faq.h}
            </h2>
            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.7 }}>{c.faq.p}</p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {c.faq.items.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════ */}
      <footer style={{
        background: '#030406',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '40px 5%',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.svg" alt="VendChain" width={28} height={28} />
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>VendChain</span>
            <span style={{ color: '#1e293b', fontSize: 12, marginLeft: 4 }}>&copy; 2026</span>
          </div>

          <div style={{ color: '#1e293b', fontSize: 12, textAlign: 'center' }}>
            {c.footer.built}
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {c.footer.links.map(l => (
              <a key={l} href="#" style={{ color: '#1e3a30', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#10b981' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#1e3a30' }}
              >{l}</a>
            ))}

            {/* Lang toggle in footer */}
            <button
              onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6, padding: '4px 10px',
                color: '#334155', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 0.5,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#10b981' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#334155' }}
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>
        </div>
      </footer>

    </div>
  )
}
