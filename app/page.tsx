'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
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
      cta1: 'Войти в платформу', cta2: 'Как это работает',
      trust: ['Solana Foundation', 'SPV Structure', 'On-chain Audit'],
      card: { label: 'Доход пула сегодня', value: '$142.30', sub: '↑ 12% к вчера', live: 'Live' },
    },
    ticker: ['VM-ALM-001 · Coca-Cola 0.5л · +350₸','VM-ALM-002 · Питьевая вода · +200₸','Выплата: 0.0012 SOL → 28 держателям','VM-ALM-003 · Lays Краб · +450₸','Новый инвестор · 500 VEND куплено','VM-ALM-001 · Red Bull · +600₸','VM-ALM-002 · Snickers · +380₸'],
    stats: [
      { v: '500+', l: 'Планируется автоматов' },
      { v: '$142', l: 'Доход за 24ч' },
      { v: '18.4%', l: 'Годовая доходность' },
      { v: '28', l: 'Инвесторов' },
    ],
    how: {
      tag: 'Как это работает', h: 'Три шага до пассивного дохода',
      p: 'От подключения кошелька до ежедневных выплат — без банков и посредников',
      steps: [
        { n: '01', t: 'Подключи кошелёк', d: 'Войди через Phantom, Solflare или Backpack. Никакой регистрации — только подпись транзакции.' },
        { n: '02', t: 'Купи долю в пуле', d: 'Приобрети VEND-токены. Каждый токен закрепляет право на долю дохода всей сети автоматов.' },
        { n: '03', t: 'Получай доход', d: 'Смарт-контракт автоматически распределяет выручку. Забирай накопленное в любое время.' },
      ],
    },
    carousel: {
      tag: 'Наши автоматы', h: 'Сеть автоматов в реальном времени',
      p: 'Каждая машина — это актив в твоём портфеле',
      perDay: '/день', salesLabel: 'Продаж/нед.',
      items: [
        { id: 'alm-001', image: '/Vend.png', gradient: 'linear-gradient(160deg,#0c1445,#1a2980)', accent: '#818cf8', location: 'Алматы · ТЦ Mega Alma', type: 'Торговый центр', revenue: '+₸3,200', sales: '847', apy: '21.3%', status: 'Online', label: 'Масштабируй портфель' },
        { id: 'ast-001', image: 'https://mir-s3-cdn-cf.behance.net/project_modules/fs/baf1e5167756725.642e5cb5d04b4.jpg', gradient: 'linear-gradient(160deg,#0d2b0d,#0a4020)', accent: '#10b981', location: 'Астана · БЦ Esil Plaza', type: 'Бизнес-центр', revenue: '+₸2,800', sales: '723', apy: '18.7%', status: 'Online', label: 'Стабильный доход' },
        { id: 'alm-002', image: 'https://th.bing.com/th/id/R.a7bf858144a50e5b72c6cd71cd2f5091?rik=oJ3Is%2fE0gpk3HQ&riu=http%3a%2f%2fkiosksoft.ru%2fuploads%2fnews_item%2fimage%2f17049%2fENRIQUETOMAS.jpg&ehk=uulrkleVjzmhaEaccofCPpcGSvIIYRURxT7pjOCXXS8%3d&risl=&pid=ImgRaw&r=0', gradient: 'linear-gradient(160deg,#2a1200,#5c2d00)', accent: '#f59e0b', location: 'Алматы · Аэропорт ALA', type: 'Аэропорт', revenue: '+₸2,100', sales: '612', apy: '14.0%', status: 'Online', label: 'Инвестируй сегодня' },
        { id: 'shm-001', image: 'https://tse3.mm.bing.net/th/id/OIP.RGqAzAke_XDaMUkCs0Go8AAAAA?rs=1&pid=ImgDetMain&o=7&rm=3', gradient: 'linear-gradient(160deg,#1a1a2e,#2d2d44)', accent: '#a78bfa', location: 'Шымкент · ТЦ Riverside', type: 'Торговый центр', revenue: '+₸1,800', sales: '—', apy: '~12%', status: 'Скоро', label: 'Скоро открытие' },
      ],
    },
    earn: {
      tag: 'Два способа зарабатывать', h: 'Инвестируй или стейкай — выбор за тобой',
      p: 'Гибкая система доходности для любой инвестиционной стратегии',
      cards: [
        { accentColor: '#059669', accentBg: 'rgba(5,150,105,0.07)', accentBorder: 'rgba(5,150,105,0.2)', tag: 'Инвестирование', t: 'Стань совладельцем сети', d: 'Купи VEND-токены и получай долю от каждой продажи в сети автоматов. Доход начисляется пропорционально количеству токенов.', rows: [['Мин. инвестиция','$10'],['Частота выплат','Ежедневно'],['Тип дохода','Revenue share']], btn: 'Купить VEND →', href: '/trade' },
        { accentColor: '#4f46e5', accentBg: 'rgba(79,70,229,0.07)', accentBorder: 'rgba(79,70,229,0.2)', tag: 'Стейкинг', t: 'Зарабатывай на стейкинге', d: 'Заблокируй VEND-токены в смарт-контракте и получай 18.4% годовых. Чем дольше держишь — тем больше зарабатываешь.', rows: [['Базовый APY','18.4%'],['Lockup период','7 дней'],['Тип дохода','Staking reward']], btn: 'Начать стейкинг →', href: '/staking' },
      ],
    },
    why: {
      tag: 'Преимущества', h: 'Почему выбирают', accent: 'VendChain?',
      items: [
        { icon: 'revenue', title: 'Реальный ежедневный доход', desc: 'Каждая продажа из автомата мгновенно поступает в пул. Ты зарабатываешь пассивно каждый день без участия в операциях.' },
        { icon: 'access', title: 'Вход от $10 без KYC', desc: 'Никаких банков, форм или верификации. Только кошелёк — и ты уже совладелец сети вендинговых автоматов.' },
        { icon: 'chain', title: 'On-chain прозрачность', desc: 'Каждая транзакция записана в блокчейне Solana. Проверяй баланс и историю выплат в любое время без доверия к посреднику.' },
        { icon: 'speed', title: 'Скорость и дешевизна Solana', desc: '400 миллисекунд финализация, менее $0.01 за выплату. Единственная сеть, где маржинальна даже $2 продажа.' },
      ],
    },
    features: {
      tag: 'Возможности', h: 'Возможности платформы', p: 'Полная инфраструктура для инвестирования в реальные активы через блокчейн',
      items: [
        { icon: '◈', t: 'Токенизация активов', d: 'Каждый VEND-токен закреплён за реальным пулом вендинговых автоматов. Юридически оформленная долевая собственность через SPV.' },
        { icon: '⟳', t: 'Автоматические выплаты', d: 'Смарт-контракт Solana распределяет доход от продаж пропорционально токенам. Без посредников, без задержек.' },
        { icon: '◎', t: 'On-chain прозрачность', d: 'Каждая транзакция от продажи до выплаты записана в блокчейне. Проверяй через Solana Explorer.' },
        { icon: '⬡', t: 'Вторичный рынок', d: 'Продай долю в любой момент. Ликвидность обеспечивается через торговлю VEND-токенами между участниками.' },
        { icon: '⊕', t: 'Низкий порог входа', d: 'Начни с любой суммы от $10. Диверсификация по пулу автоматов снижает риски отдельной точки.' },
        { icon: '⚙', t: 'IoT + Oracle интеграция', d: 'Автоматы передают данные о продажах через оракул в смарт-контракт. Данные верифицируются через платёжные системы.' },
      ],
    },
    solana: {
      tag: 'Почему Solana', h: 'Убери Solana — проект сломается',
      p: 'VendChain использует технологии, которые существуют только на Solana. Это не выбор — это единственная возможность.',
      tableHeaders: ['Критерий', 'Solana', 'Ethereum', 'BSC'],
      tableRows: [
        ['Комиссия за выплату', '$0.00025', '$5 – 50', '$0.05 – 0.5'],
        ['Скорость', '400мс', '12 – 60 сек', '3 – 5 сек'],
        ['Выплата при $2 продаже', 'Выгодно', 'Убыток', 'Пограничное'],
        ['Solana Pay (QR оплата)', 'Нативный', 'Нет', 'Нет'],
        ['Token-2022 Transfer Hook', 'Есть', 'Нет', 'Нет'],
        ['Децентрализация', 'Да', 'Да', 'Нет'],
      ],
      tableStatus: [['ok','bad','warn'],['ok','bad','bad'],['ok','bad','warn'],['ok','bad','bad'],['ok','bad','bad'],['ok','ok','bad']],
      points: [
        { icon: '⚡', title: 'Solana Pay — оплата у автомата за 400мс', desc: 'Покупатель сканирует QR → транзакция за 400мс → товар выдан. На ETH $10 комиссия убивает бизнес с $2 шоколадкой.' },
        { icon: '🔗', title: 'Token-2022 Transfer Hook — автоматический burn', desc: 'Каждый перевод VEND автоматически сжигает 10% через hook-программу. Встроено в протокол — на EVM такого стандарта нет.' },
        { icon: '📍', title: 'PDAs — детерминированная адресация машин', desc: 'Каждая машина — PDA (Program Derived Address). Адрес = программа + seed. Без приватного ключа, без базы данных.' },
        { icon: '💎', title: 'Compressed NFTs — сертификаты владения', desc: '1000 машин = 1000 cNFT за $0.01 суммарно (Metaplex Bubblegum). На Ethereum это тысячи долларов.' },
      ],
      warningTitle: 'Что произойдёт без Solana?',
      warningItems: [
        'На Ethereum: $10 комиссия за каждую выплату → инвесторы уйдут в убыток',
        'Без Solana Pay: ручная обработка платежей → посредник → теряется весь смысл',
        'Без PDAs: хранение данных машин в базе данных → централизация → уязвимость',
        'Без Token-2022: burn через custodial обёртку → риски безопасности',
        'Итог: система становится обычным финтех-стартапом, а не on-chain протоколом',
      ],
    },
    about: {
      tag: 'О нас', h: 'О платформе VendChain',
      p1: 'VendChain — инфраструктура для токенизации физических активов на блокчейне Solana. Мы начали с вендинговых автоматов как понятного и предсказуемого актива с ежедневным cashflow.',
      p2: 'Наша миссия — открыть доступ к реальным инвестициям для любого человека с суммой от $10, сохранив полную прозрачность через блокчейн.',
      rows: [['100%','On-chain операции'],['< $0.01','Комиссия за выплату'],['Ежедневно','Частота выплат'],['SPV','Юридическая структура']],
      btn: 'Начать инвестировать',
    },
    cta: { h: 'Готов начать?', p: 'Подключи кошелёк и войди в платформу за 30 секунд. Поддерживаются Phantom, Solflare и Backpack.', b1: 'Войти в платформу', b2: 'Узнать больше', wallets: 'Phantom · Solflare · Backpack' },
    faq: {
      tag: 'FAQ', h: 'Частые вопросы', p: 'Всё что нужно знать перед первой инвестицией',
      items: [
        { q: 'Что обеспечивает ценность VEND-токена?', a: 'Каждый токен юридически привязан к пулу вендинговых автоматов через SPV-структуру. Держатель токена имеет право на долю дохода пропорционально своей доле.' },
        { q: 'Как часто выплачивается доход?', a: 'Смарт-контракт накапливает доход с каждой продажи. Вы можете забрать накопленное в любое время — комиссия Solana составляет менее $0.01.' },
        { q: 'Что происходит при добавлении новых автоматов?', a: 'Доход новых машин автоматически добавляется в общий пул. Держатели существующих токенов получают выгоду без необходимости покупать новые токены.' },
        { q: 'Можно ли продать токены?', a: 'Да, VEND-токены торгуются на вторичном рынке между участниками платформы. Ликвидность обеспечивается через Solana.' },
        { q: 'Нужна ли верификация личности (KYC)?', a: 'Для входа нужен только криптокошелёк. Никаких форм, email-регистрации или документов. Всё управляется on-chain.' },
        { q: 'Какие кошельки поддерживаются?', a: 'Phantom, Solflare и Backpack. Все три работают на Solana и поддерживают подпись транзакций без передачи приватного ключа.' },
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
      pBold: '$10', p2: ' and receive revenue from every sale automatically.',
      cta1: 'Enter platform', cta2: 'How it works',
      trust: ['Solana Foundation', 'SPV Structure', 'On-chain Audit'],
      card: { label: 'Pool revenue today', value: '$142.30', sub: '↑ 12% vs yesterday', live: 'Live' },
    },
    ticker: ['VM-ALM-001 · Coca-Cola 0.5L · +350₸','VM-ALM-002 · Water · +200₸','Payout: 0.0012 SOL → 28 holders','VM-ALM-003 · Lays Crab · +450₸','New investor · 500 VEND purchased','VM-ALM-001 · Red Bull · +600₸','VM-ALM-002 · Snickers · +380₸'],
    stats: [
      { v: '500+', l: 'Machines planned' },
      { v: '$142', l: '24h revenue' },
      { v: '18.4%', l: 'Annual yield' },
      { v: '28', l: 'Investors' },
    ],
    how: {
      tag: 'How it works', h: 'Three steps to passive income',
      p: 'From wallet connection to daily payouts — without banks or intermediaries',
      steps: [
        { n: '01', t: 'Connect your wallet', d: 'Sign in with Phantom, Solflare or Backpack. No registration — just sign a transaction.' },
        { n: '02', t: 'Buy a pool share', d: "Purchase VEND tokens. Each token establishes your right to a share of the network's total revenue." },
        { n: '03', t: 'Earn revenue', d: 'Smart contracts automatically distribute earnings. Withdraw your accrued income at any time.' },
      ],
    },
    carousel: {
      tag: 'Our machines', h: 'Machine network in real time',
      p: 'Each machine is an asset in your portfolio',
      perDay: '/day', salesLabel: 'Sales/week',
      items: [
        { id: 'alm-001', image: 'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=600&fit=crop&q=80', gradient: 'linear-gradient(160deg,#0c1445,#1a2980)', accent: '#818cf8', location: 'Almaty · Mega Alma Mall', type: 'Shopping mall', revenue: '+₸3,200', sales: '847', apy: '21.3%', status: 'Online', label: 'Scale your portfolio' },
        { id: 'ast-001', image: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=600&fit=crop&q=80', gradient: 'linear-gradient(160deg,#0d2b0d,#0a4020)', accent: '#10b981', location: 'Astana · Esil Plaza', type: 'Business center', revenue: '+₸2,800', sales: '723', apy: '18.7%', status: 'Online', label: 'Stable daily income' },
        { id: 'alm-002', image: 'https://images.unsplash.com/photo-1604754742629-3e5728249d73?w=600&fit=crop&q=80', gradient: 'linear-gradient(160deg,#2a1200,#5c2d00)', accent: '#f59e0b', location: 'Almaty · ALA Airport', type: 'Airport', revenue: '+₸2,100', sales: '612', apy: '14.0%', status: 'Online', label: 'Invest today' },
        { id: 'shm-001', image: 'https://images.unsplash.com/photo-1588421357574-87938a86fa28?w=600&fit=crop&q=80', gradient: 'linear-gradient(160deg,#1a1a2e,#2d2d44)', accent: '#a78bfa', location: 'Shymkent · Riverside Mall', type: 'Shopping mall', revenue: '+₸1,800', sales: '—', apy: '~12%', status: 'Soon', label: 'Opening soon' },
      ],
    },
    earn: {
      tag: 'Two ways to earn', h: 'Invest or stake — your choice',
      p: 'Flexible yield system for any investment strategy',
      cards: [
        { accentColor: '#059669', accentBg: 'rgba(5,150,105,0.07)', accentBorder: 'rgba(5,150,105,0.2)', tag: 'Investing', t: 'Become a co-owner', d: 'Buy VEND tokens and receive a share of every sale across the machine network. Revenue is distributed proportionally to your token holdings.', rows: [['Min. investment','$10'],['Payout frequency','Daily'],['Income type','Revenue share']], btn: 'Buy VEND →', href: '/trade' },
        { accentColor: '#4f46e5', accentBg: 'rgba(79,70,229,0.07)', accentBorder: 'rgba(79,70,229,0.2)', tag: 'Staking', t: 'Earn staking rewards', d: 'Lock VEND tokens in a smart contract and earn 18.4% annual yield. The longer you hold — the more you earn.', rows: [['Base APY','18.4%'],['Lock period','7 days'],['Income type','Staking reward']], btn: 'Start staking →', href: '/staking' },
      ],
    },
    why: {
      tag: 'Why us', h: 'Why choose', accent: 'VendChain?',
      items: [
        { icon: 'revenue', title: 'Real daily income', desc: 'Every vending machine sale flows into the pool instantly. You earn passively every day with no operational involvement.' },
        { icon: 'access', title: 'Entry from $10, no KYC', desc: "No banks, forms, or verification. Just a wallet — and you're already a co-owner of the vending machine network." },
        { icon: 'chain', title: 'On-chain transparency', desc: 'Every transaction is recorded on Solana blockchain. Check your balance and payout history at any time — no trust required.' },
        { icon: 'speed', title: 'Solana speed & low fees', desc: '400ms finalization, less than $0.01 per payout. The only network where even a $2 sale is profitable for all parties.' },
      ],
    },
    features: {
      tag: 'Features', h: 'Platform features', p: 'Full infrastructure for investing in real assets through blockchain',
      items: [
        { icon: '◈', t: 'Asset tokenization', d: 'Each VEND token is backed by a real pool of vending machines. Legally structured fractional ownership via SPV.' },
        { icon: '⟳', t: 'Automatic payouts', d: 'Solana smart contracts distribute revenue from sales proportionally. No intermediaries, no delays.' },
        { icon: '◎', t: 'On-chain transparency', d: 'Every transaction from sale to payout is recorded on blockchain. Verify at any time via Solana Explorer.' },
        { icon: '⬡', t: 'Secondary market', d: 'Sell your share at any time. Liquidity is provided through VEND token trading between participants.' },
        { icon: '⊕', t: 'Low entry barrier', d: 'Start with any amount from $10. Diversification across the machine pool reduces individual point risks.' },
        { icon: '⚙', t: 'IoT + Oracle integration', d: 'Machines transmit sales data via oracle to smart contracts. Data is verified through payment systems.' },
      ],
    },
    solana: {
      tag: 'Why Solana', h: 'Remove Solana — the project collapses',
      p: "VendChain uses technologies that exist only on Solana. This isn't a choice — it's the only option.",
      tableHeaders: ['Criteria', 'Solana', 'Ethereum', 'BSC'],
      tableRows: [
        ['Payout fee', '$0.00025', '$5 – 50', '$0.05 – 0.5'],
        ['Speed', '400ms', '12 – 60 sec', '3 – 5 sec'],
        ['Payout on $2 sale', 'Profitable', 'Loss', 'Borderline'],
        ['Solana Pay (QR payment)', 'Native', 'No', 'No'],
        ['Token-2022 Transfer Hook', 'Yes', 'No', 'No'],
        ['Decentralization', 'Yes', 'Yes', 'No'],
      ],
      tableStatus: [['ok','bad','warn'],['ok','bad','bad'],['ok','bad','warn'],['ok','bad','bad'],['ok','bad','bad'],['ok','ok','bad']],
      points: [
        { icon: '⚡', title: 'Solana Pay — payment at machine in 400ms', desc: 'Customer scans QR → transaction finalizes in 400ms → item dispensed. On ETH, a $10 fee kills the business model of a $2 chocolate bar.' },
        { icon: '🔗', title: 'Token-2022 Transfer Hook — automatic burn', desc: "Every VEND token transfer automatically burns 10% via a hook program. Built into the protocol — this standard doesn't exist on EVM." },
        { icon: '📍', title: 'PDAs — deterministic machine addressing', desc: 'Each machine is a PDA (Program Derived Address). Address = program + seed — no private key, no database. No EVM equivalent.' },
        { icon: '💎', title: 'Compressed NFTs — ownership certificates', desc: '1000 machines = 1000 cNFTs for $0.01 total (Metaplex Bubblegum). On Ethereum this costs thousands of dollars.' },
      ],
      warningTitle: 'What happens without Solana?',
      warningItems: [
        'On Ethereum: $10 fee per payout → investors go into loss',
        'Without Solana Pay: manual payment processing → intermediary needed → defeats the purpose',
        'Without PDAs: machine data stored in a database → centralization → vulnerability',
        'Without Token-2022: burn via custodial wrapper → security risks',
        'Result: system becomes a regular fintech startup, not an on-chain protocol',
      ],
    },
    about: {
      tag: 'About', h: 'About VendChain',
      p1: 'VendChain is an infrastructure for tokenizing physical assets on the Solana blockchain. We started with vending machines as a clear and predictable asset with daily cashflow.',
      p2: 'Our mission is to open access to real investments for anyone with as little as $10, while maintaining full transparency through blockchain.',
      rows: [['100%','On-chain operations'],['< $0.01','Payout fee'],['Daily','Payout frequency'],['SPV','Legal structure']],
      btn: 'Start investing',
    },
    cta: { h: 'Ready to start?', p: 'Connect your wallet and enter the platform in 30 seconds. Phantom, Solflare and Backpack supported.', b1: 'Enter platform', b2: 'Learn more', wallets: 'Phantom · Solflare · Backpack' },
    faq: {
      tag: 'FAQ', h: 'Frequently asked questions', p: 'Everything you need to know before your first investment',
      items: [
        { q: 'What backs the value of VEND token?', a: 'Each token is legally tied to a pool of vending machines through an SPV structure. Token holders have the right to a proportional share of revenue.' },
        { q: 'How often is income paid out?', a: 'The smart contract accumulates revenue from each sale. You can withdraw accrued amounts at any time — Solana fees are less than $0.01.' },
        { q: 'What happens when new machines are added?', a: 'Revenue from new machines is automatically added to the general pool. Existing token holders benefit without needing to buy new tokens.' },
        { q: 'Can I sell tokens?', a: 'Yes, VEND tokens are traded on the secondary market between platform participants. Liquidity is provided through Solana.' },
        { q: 'Is identity verification (KYC) required?', a: 'All you need is a crypto wallet. No forms, email registration, or documents required. Everything is managed on-chain.' },
        { q: 'Which wallets are supported?', a: 'Phantom, Solflare and Backpack. All three work on Solana and support transaction signing without revealing your private key.' },
      ],
    },
    footer: { built: 'Built on Solana · Hackathon 2026 · Decentrathon', links: ['GitHub', 'Docs', 'Twitter'] },
  },
} as const

// ─────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' as const } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const cardAnim = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } }

// ─────────────────────────────────────────────────────────────────────
// PARTICLE CANVAS (network visualization effect)
// ─────────────────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = 0, H = 0, id = 0

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.8 + 0.5, o: Math.random() * 0.22 + 0.07,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 110) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(5,150,105,${0.1 * (1 - d / 110)})`
            ctx.lineWidth = 0.7
            ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke()
          }
        }
      }
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(5,150,105,${p.o})`; ctx.fill()
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

// ─────────────────────────────────────────────────────────────────────
// MACHINE CAROUSEL
// ─────────────────────────────────────────────────────────────────────
type CarouselItem = {
  id: string; image: string; gradient: string; accent: string; location: string;
  type: string; revenue: string; sales: string; apy: string; status: string; label: string;
}
type CarouselLabels = { perDay: string; salesLabel: string }

function MachineCarousel({ items, labels }: { items: readonly CarouselItem[]; labels: CarouselLabels }) {
  const [cur, setCur] = useState(0)
  const n = items.length
  const next = useCallback(() => setCur(i => (i + 1) % n), [n])
  const prev = () => setCur(i => (i - 1 + n) % n)
  useEffect(() => { const t = setInterval(next, 4200); return () => clearInterval(t) }, [next])
  const idx = (o: number) => (cur + o + n) % n

  return (
    <div style={{ position: 'relative' }}>
      {/* Cards row */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, padding: '16px 60px 52px' }}>
        {([-1, 0, 1] as const).map(offset => {
          const item = items[idx(offset)]
          const center = offset === 0
          return (
            <motion.div
              key={item.id + cur}
              animate={{ scale: center ? 1 : 0.83, opacity: center ? 1 : 0.52, y: center ? 0 : 26 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              onClick={() => !center && (offset === -1 ? prev() : next())}
              style={{ width: center ? 300 : 244, height: center ? 430 : 365, borderRadius: 22, background: item.gradient, flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: center ? 'default' : 'pointer', boxShadow: center ? '0 28px 72px rgba(0,0,0,0.45)' : '0 8px 24px rgba(0,0,0,0.2)', padding: 10 }}
            >
              {/* Photo frame with rounded inset */}
              <div style={{ position: 'absolute', top: 10, left: 10, right: 10, height: center ? 220 : 180, borderRadius: 14, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                <img
                  src={item.image}
                  alt={item.location}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                {/* photo overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 55%,rgba(0,0,0,0.55) 100%)' }} />
              </div>
              {/* status badge */}
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: `1px solid ${item.accent}60`, borderRadius: 100, padding: '3px 10px', fontSize: 10, color: item.accent, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, zIndex: 2 }}>
                {item.status === 'Online' && <span className="pulse-dot" style={{ width: 4, height: 4, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />}
                {item.status}
              </div>
              {/* type label */}
              <div style={{ position: 'absolute', top: 20, left: 20, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.3, zIndex: 2 }}>{item.type}</div>
              {/* stats panel — below photo */}
              <div style={{ position: 'absolute', top: center ? 242 : 202, left: 10, right: 10 }}>
                <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { l: `Доход${labels.perDay}`, v: item.revenue, c: item.accent },
                    { l: labels.salesLabel, v: item.sales, c: '#fff' },
                    { l: 'APY', v: item.apy, c: '#10b981' },
                    { l: 'Статус', v: item.status, c: item.accent },
                  ].map(s => (
                    <div key={s.l}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{s.l}</div>
                      <div style={{ fontSize: center ? 16 : 13, fontWeight: 800, color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* bottom location + label */}
              <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>{item.location}</div>
                <div style={{ fontSize: center ? 15 : 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{item.label}</div>
              </div>
            </motion.div>
          )
        })}
      </div>
      {/* Arrows */}
      {(['prev','next'] as const).map(d => (
        <button key={d} onClick={d === 'prev' ? prev : next}
          style={{ position: 'absolute', top: '42%', transform: 'translateY(-50%)', [d === 'prev' ? 'left' : 'right']: 0, width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', cursor: 'pointer', fontSize: 20, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#059669'; b.style.color = '#fff'; b.style.borderColor = '#059669' }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#fff'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0' }}
        >{d === 'prev' ? '‹' : '›'}</button>
      ))}
      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => setCur(i)} className={`carousel-dot ${i === cur ? 'active' : 'inactive'}`} style={{ width: i === cur ? 28 : 8 }} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// WHY ICONS (inline SVG, emerald stroke)
// ─────────────────────────────────────────────────────────────────────
const whyIcons: Record<string, React.ReactNode> = {
  revenue: <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="28" width="7" height="10" rx="1.5"/><rect x="18" y="20" width="7" height="18" rx="1.5"/><rect x="30" y="12" width="7" height="26" rx="1.5"/><path d="M8 20 L16 14 L24 18 L38 8" strokeWidth="1.4"/><circle cx="38" cy="8" r="2" fill="#059669" stroke="none"/></svg>,
  access: <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="22" r="9"/><path d="M27 22 L38 22"/><path d="M34 18 L38 22 L34 26"/><circle cx="18" cy="22" r="3.5" fill="#059669" fillOpacity="0.15"/></svg>,
  chain: <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22 C10 14 34 14 38 22 C34 30 10 30 6 22Z"/><circle cx="22" cy="22" r="5"/><circle cx="22" cy="22" r="2" fill="#059669" fillOpacity="0.2"/></svg>,
  speed: <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M26 6 L16 22 H24 L18 38 L34 18 H25 L26 6Z" fill="#059669" fillOpacity="0.08"/><path d="M26 6 L16 22 H24 L18 38 L34 18 H25 L26 6Z"/></svg>,
}

// ─────────────────────────────────────────────────────────────────────
// REVENUE VISUAL (light theme)
// ─────────────────────────────────────────────────────────────────────
function RevenueVisual() {
  const bars = [62, 78, 54, 91, 68, 84, 100, 73, 88, 95, 79, 83]
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 20, padding: '28px', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, background: 'radial-gradient(circle,rgba(5,150,105,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 }}>ДОХОД СЕТИ (30 дн.)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>$4,267</div>
        </div>
        <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#059669', fontWeight: 600 }}>↑ 18.4% APY</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 72, marginBottom: 18 }}>
        {bars.map((h, i) => (
          <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ duration: 0.55, delay: i * 0.04, ease: 'easeOut' }}
            style={{ flex: 1, background: i === bars.length - 1 ? 'linear-gradient(180deg,#059669,#047857)' : 'rgba(5,150,105,0.2)', borderRadius: '4px 4px 0 0' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[{ id: 'ALM-001', rev: '+₸3,200' }, { id: 'ALM-002', rev: '+₸2,800' }, { id: 'ALM-003', rev: '+₸2,100' }].map(m => (
          <div key={m.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>VM-{m.id}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{m.rev}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span className="pulse-dot" style={{ width: 5, height: 5, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Online</span>
            </div>
          </div>
        ))}
      </div>
      {/* Badge вылезает за пределы */}
      <div className="float" style={{ position: 'absolute', bottom: -20, right: -20, background: 'linear-gradient(135deg,#047857,#10b981)', borderRadius: 14, padding: '14px 20px', boxShadow: '0 16px 40px rgba(5,150,105,0.35)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>$142 / день</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Средний доход пула</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// FAQ ITEM
// ─────────────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div variants={cardAnim} style={{ background: open ? 'rgba(5,150,105,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${open ? 'rgba(5,150,105,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.25s, background 0.25s' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.22 }} style={{ color: '#10b981', fontSize: 22, fontWeight: 300, flexShrink: 0, lineHeight: 1 }}>+</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeInOut' }}>
            <div style={{ padding: '0 24px 20px', color: '#94a3b8', fontSize: 14, lineHeight: 1.8 }}>{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────
function SectionWrap({ id, bg, children, border = true }: { id?: string; bg: string; children: React.ReactNode; border?: boolean }) {
  return (
    <section id={id} style={{ background: bg, borderTop: border ? '1px solid #e2e8f0' : 'none' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 5%' }}>{children}</div>
    </section>
  )
}

function SectionHead({ tag, title, accent, sub, center = false, dark = false }: { tag: string; title: string; accent?: string; sub?: string; center?: boolean; dark?: boolean }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 60, textAlign: center ? 'center' : 'left' }}>
      <div className="section-tag" style={{ display: 'inline-flex', ...(dark ? { background: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.3)', color: '#10b981' } : {}) }}>{tag}</div>
      <h2 style={{ fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 800, letterSpacing: '-1px', color: dark ? '#fff' : '#0f172a', marginBottom: sub ? 14 : 0, lineHeight: 1.1 }}>
        {title}{accent && <> <span className="grad">{accent}</span></>}
      </h2>
      {sub && <p style={{ color: dark ? '#94a3b8' : '#64748b', fontSize: 15, maxWidth: 480, margin: center ? '0 auto' : undefined, lineHeight: 1.75 }}>{sub}</p>}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// TABLE CELL STATUS COLOUR
// ─────────────────────────────────────────────────────────────────────
const statusStyle = (s: string) => ({
  ok: { color: '#059669', fontWeight: 700 as const },
  bad: { color: '#ef4444' },
  warn: { color: '#f59e0b' },
}[s] ?? {})

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
  useEffect(() => { if (connected && mounted) router.push('/profile') }, [connected, mounted, router])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const c = T[lang]
  const open = () => setVisible(true)
  const toggleLang = () => setLang(l => l === 'ru' ? 'en' : 'ru')

  return (
    <div style={{ background: '#080c12', minHeight: '100vh', color: '#f1f5f9', overflowX: 'hidden' }}>

      {/* ══ NAV ══ */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%', background: scrolled ? 'rgba(6,10,16,0.97)' : 'rgba(6,10,16,0.55)', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none', backdropFilter: 'blur(22px)', transition: 'all 0.3s' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/vend-logo.png" alt="VendChain" height={40} width={40} style={{ display: 'block', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.2px' }}>VendChain</span>
        </a>

        {mounted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {[{ label: c.nav.how, href: '#how' }, { label: c.nav.feat, href: '#features' }, { label: c.nav.faq, href: '#faq' }].map(l => (
              <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
            ))}
          </div>
        )}

        {mounted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '5px 11px' }}>
              <span className="pulse-dot" style={{ width: 5, height: 5, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
              {c.nav.net}
            </div>
            <button onClick={toggleLang} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 0.5 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#10b981'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(5,150,105,0.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
            >{lang === 'ru' ? 'EN' : 'RU'}</button>
            <button onClick={open} className="btn btn-nav-cta">{connected ? c.nav.open : c.nav.cta}</button>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg,#020710 0%,#061812 45%,#030a18 100%)' }}>
        <ParticleCanvas />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '15%', left: '5%', width: 520, height: 520, background: 'radial-gradient(circle,rgba(5,150,105,0.12) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 380, height: 380, background: 'radial-gradient(circle,rgba(79,70,229,0.1) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom,transparent,#080c12)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 5% 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', position: 'relative', zIndex: 2, width: '100%' }}>
          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="section-tag" style={{ marginBottom: 26, background: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.3)', color: '#10b981' }}>
                <span className="pulse-dot" style={{ width: 5, height: 5, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                {c.hero.badge}
              </div>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              style={{ fontSize: 'clamp(34px,4.2vw,58px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-2.5px', color: '#fff', marginBottom: 22 }}>
              {c.hero.h1[0]}<br />{c.hero.h1[1]}<br /><span className="grad">{c.hero.accent}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.8, marginBottom: 36, maxWidth: 500 }}>
              {c.hero.p}<strong style={{ color: '#10b981' }}>{c.hero.pBold}</strong>{c.hero.p2}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <button onClick={open} className="btn btn-emerald" style={{ padding: '14px 32px', fontSize: 15, boxShadow: '0 0 32px rgba(5,150,105,0.4)' }}>{c.hero.cta1} →</button>
              <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'rgba(255,255,255,0.12)'; a.style.color = '#fff' }}
                onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'rgba(255,255,255,0.07)'; a.style.color = '#cbd5e1' }}
              >{c.hero.cta2}</a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
              {c.hero.trust.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                  <span style={{ color: '#10b981' }}>✓</span> {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: hero card */}
          <motion.div initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, delay: 0.15 }}
            className="float"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 24, padding: '30px', position: 'relative', overflow: 'hidden', boxShadow: '0 28px 80px rgba(0,0,0,0.45), 0 0 60px rgba(5,150,105,0.1)', backdropFilter: 'blur(12px)' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle,rgba(5,150,105,0.15) 0%,transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{c.hero.card.label}</span>
              <span style={{ background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 100, padding: '2px 9px', fontSize: 10, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="pulse-dot" style={{ width: 4, height: 4, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />{c.hero.card.live}
              </span>
            </div>
            <div style={{ fontSize: 42, fontWeight: 800, color: '#10b981', letterSpacing: '-1.5px', marginBottom: 4 }}>{c.hero.card.value}</div>
            <div style={{ fontSize: 13, color: '#059669', marginBottom: 24 }}>{c.hero.card.sub}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[{ l: lang === 'ru' ? 'Автоматов' : 'Machines', v: '3' }, { l: lang === 'ru' ? 'Инвесторов' : 'Investors', v: '28' }, { l: 'APY', v: '18.4%' }, { l: lang === 'ru' ? 'Комиссия' : 'Fee', v: '<$0.01' }].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '11px 14px' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 38 }}>
              {[40, 65, 45, 80, 60, 90, 70, 95, 75, 88].map((h, i) => (
                <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.6, delay: 0.9 + i * 0.04 }}
                  style={{ flex: 1, background: i === 9 ? 'linear-gradient(180deg,#10b981,#059669)' : 'rgba(5,150,105,0.25)', borderRadius: '3px 3px 0 0' }} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ TICKER ══ */}
      <div style={{ background: 'rgba(4,8,14,0.9)', borderTop: '1px solid rgba(5,150,105,0.15)', borderBottom: '1px solid rgba(5,150,105,0.15)', padding: '10px 0', overflow: 'hidden' }}>
        <div className="ticker" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          {[...c.ticker, ...c.ticker].map((t, i) => (
            <span key={i} style={{ padding: '0 48px', fontSize: 12, color: '#475569', fontFamily: 'monospace', letterSpacing: 0.3 }}>
              <span style={{ color: '#10b981', marginRight: 10 }}>◆</span>{t}
            </span>
          ))}
        </div>
      </div>

      {/* ══ STATS ══ */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5%', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {c.stats.map((s, i) => (
            <motion.div key={i} variants={cardAnim} style={{ textAlign: 'center', padding: '44px 20px', borderRight: i < 3 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1.5px', background: 'linear-gradient(135deg,#059669,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 8 }}>{s.v}</div>
              <div style={{ fontSize: 13, color: '#64748b', letterSpacing: 0.3 }}>{s.l}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <SectionWrap id="how" bg="#0a1018" border={false}>
        <SectionHead tag={c.how.tag} title={c.how.h} sub={c.how.p} center dark />
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 44, left: '17%', right: '17%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(5,150,105,0.35),rgba(79,70,229,0.25),transparent)' }} />
          {c.how.steps.map((s, i) => (
            <motion.div key={i} variants={cardAnim} whileHover={{ y: -6 }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '34px 28px', position: 'relative', overflow: 'hidden', transition: 'border-color 0.3s, box-shadow 0.3s' }}
              onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'rgba(5,150,105,0.3)'; d.style.boxShadow = '0 12px 40px rgba(5,150,105,0.08)' }}
              onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'rgba(255,255,255,0.07)'; d.style.boxShadow = 'none' }}>
              <div style={{ position: 'absolute', top: 14, right: 18, fontSize: 68, fontWeight: 900, color: '#10b981', opacity: 0.06, lineHeight: 1, userSelect: 'none' }}>{s.n}</div>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 800, fontSize: 14, marginBottom: 22 }}>{s.n}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' }}>{s.t}</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8 }}>{s.d}</p>
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* ══ EARN ══ */}
      <SectionWrap bg="#fff">
        <SectionHead tag={c.earn.tag} title={c.earn.h} sub={c.earn.p} center />
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          {c.earn.cards.map((card, i) => (
            <motion.div key={i} variants={cardAnim} whileHover={{ y: -6 }}
              style={{ background: card.accentBg, border: `1px solid ${card.accentBorder}`, borderRadius: 20, padding: '38px 34px', position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.3s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 56px ${card.accentColor}16` }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: `radial-gradient(circle,${card.accentColor}12 0%,transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ display: 'inline-block', background: `${card.accentColor}14`, border: `1px solid ${card.accentColor}30`, borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: card.accentColor, marginBottom: 18, textTransform: 'uppercase' as const }}>{card.tag}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.4px' }}>{card.t}</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, marginBottom: 26 }}>{card.d}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                {card.rows.map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{l}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: card.accentColor }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={open} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: card.accentColor, color: '#fff', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = `0 8px 24px ${card.accentColor}40` }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ''; b.style.boxShadow = '' }}
              >{card.btn}</button>
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* ══ MACHINE CAROUSEL ══ */}
      <SectionWrap bg="#06101a" border={false}>
        <SectionHead tag={c.carousel.tag} title={c.carousel.h} sub={c.carousel.p} center dark />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
          <MachineCarousel items={c.carousel.items} labels={{ perDay: c.carousel.perDay, salesLabel: c.carousel.salesLabel }} />
        </motion.div>
      </SectionWrap>

      {/* ══ WHY VENDCHAIN ══ */}
      <SectionWrap bg="#fff">
        <SectionHead tag={c.why.tag} title={c.why.h} accent={c.why.accent} />
        <motion.div key={lang + '-why'} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {c.why.items.map((item, i) => (
            <motion.div key={item.icon} variants={cardAnim} whileHover={{ y: -6 }} className="card"
              style={{ padding: '34px 30px', display: 'flex', flexDirection: 'column', gap: 18, marginTop: i % 2 === 1 ? 40 : 0 }}>
              <div style={{ width: 62, height: 62, borderRadius: 16, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {whyIcons[item.icon]}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.2px' }}>{item.title}</h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.85 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* ══ FEATURES ══ */}
      <SectionWrap id="features" bg="#0a1018" border={false}>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 56 }}>
          <div className="section-tag" style={{ background: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.3)', color: '#10b981' }}>{c.features.tag}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(24px,2.8vw,36px)', fontWeight: 800, letterSpacing: '-0.8px', color: '#fff', marginBottom: 8 }}>{c.features.h}</h2>
              <p style={{ color: '#64748b', fontSize: 15, maxWidth: 420, lineHeight: 1.7 }}>{c.features.p}</p>
            </div>
            <a href="#faq" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#10b981', border: '1.5px solid rgba(5,150,105,0.35)', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'rgba(5,150,105,0.1)'; a.style.borderColor = 'rgba(5,150,105,0.6)' }}
              onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'transparent'; a.style.borderColor = 'rgba(5,150,105,0.35)' }}
            >FAQ →</a>
          </div>
        </motion.div>
        <motion.div key={lang + '-feat'} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {c.features.items.map(f => (
            <motion.div key={f.t} variants={cardAnim} whileHover={{ y: -5 }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '26px 24px', display: 'flex', gap: 16, transition: 'border-color 0.3s, box-shadow 0.3s' }}
              onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'rgba(5,150,105,0.3)'; d.style.boxShadow = '0 8px 32px rgba(5,150,105,0.07)' }}
              onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'rgba(255,255,255,0.07)'; d.style.boxShadow = 'none' }}>
              <div className="icon-em" style={{ flexShrink: 0, width: 46, height: 46, background: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.25)' }}>{f.icon}</div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#e2e8f0' }}>{f.t}</h3>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.8 }}>{f.d}</p>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#10b981', fontSize: 12, marginTop: 10, textDecoration: 'none', fontWeight: 600 }}>
                  {lang === 'ru' ? 'Подробнее' : 'Learn more'} →
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </SectionWrap>

      {/* ══ WHY SOLANA (dark section for impact) ══ */}
      <section style={{ background: 'linear-gradient(135deg,#071a10 0%,#0a1f18 50%,#07131a 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(5,150,105,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(5,150,105,0.04) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
        <div style={{ position: 'absolute', top: -80, left: -80, width: 420, height: 420, background: 'radial-gradient(circle,rgba(5,150,105,0.13) 0%,transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 5%', position: 'relative', zIndex: 1 }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-tag" style={{ background: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.3)', color: '#10b981' }}>{c.solana.tag}</div>
            <h2 style={{ fontSize: 'clamp(26px,3.2vw,40px)', fontWeight: 800, letterSpacing: '-1px', color: '#fff', marginBottom: 14 }}>{c.solana.h}</h2>
            <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>{c.solana.p}</p>
          </motion.div>

          {/* Comparison table */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden', marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: 'rgba(5,150,105,0.1)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {c.solana.tableHeaders.map((h, i) => (
                <div key={i} style={{ padding: '13px 20px', fontSize: 11, fontWeight: 700, color: i === 0 ? '#64748b' : i === 1 ? '#10b981' : '#475569', letterSpacing: 1.2, textTransform: 'uppercase' as const }}>{h}</div>
              ))}
            </div>
            {c.solana.tableRows.map((row, ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: ri < c.solana.tableRows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {row.map((cell, ci) => (
                  <div key={ci} style={{ padding: '13px 20px', fontSize: 13, background: ci === 1 ? 'rgba(5,150,105,0.06)' : 'transparent', color: ci === 0 ? '#94a3b8' : undefined, ...( ci > 0 ? statusStyle(c.solana.tableStatus[ri][ci - 1]) : {}) }}>
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </motion.div>

          {/* 4 key points */}
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 40 }}>
            {c.solana.points.map((pt, i) => (
              <motion.div key={i} variants={cardAnim} whileHover={{ y: -4 }}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '26px 24px', transition: 'border-color 0.3s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{pt.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>{pt.title}</h3>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.8 }}>{pt.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Warning */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fca5a5' }}>{c.solana.warningTitle}</h3>
            </div>
            {c.solana.warningItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < c.solana.warningItems.length - 1 ? 8 : 0 }}>
                <span style={{ color: '#ef4444', fontSize: 13, marginTop: 2, flexShrink: 0 }}>×</span>
                <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.65 }}>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ ABOUT ══ */}
      <SectionWrap id="about" bg="#fff">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, x: -28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }} style={{ paddingBottom: 44, paddingRight: 32 }}>
            <RevenueVisual />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.1 }}>
            <div className="section-tag">{c.about.tag}</div>
            <h2 style={{ fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 18, color: '#0f172a', lineHeight: 1.2 }}>{c.about.h}</h2>
            <p style={{ color: '#64748b', lineHeight: 1.85, marginBottom: 14, fontSize: 15 }}>{c.about.p1}</p>
            <p style={{ color: '#64748b', lineHeight: 1.85, marginBottom: 28, fontSize: 15 }}>{c.about.p2}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 30 }}>
              {c.about.rows.map(([v, l]) => (
                <div key={l} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 800, fontSize: 19, color: '#059669' }}>{v}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={open} className="btn btn-emerald" style={{ padding: '12px 26px' }}>{c.about.btn} →</button>
          </motion.div>
        </div>
      </SectionWrap>

      {/* ══ CTA ══ */}
      <section style={{ background: 'linear-gradient(135deg,#052818 0%,#071c14 40%,#070d1a 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(ellipse 60% 80% at 20% 50%,rgba(5,150,105,0.18) 0%,transparent 55%),radial-gradient(ellipse 40% 60% at 80% 50%,rgba(79,70,229,0.1) 0%,transparent 50%)' }} />
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          style={{ maxWidth: 680, margin: '0 auto', padding: '88px 5%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(30px,3.8vw,48px)', fontWeight: 800, letterSpacing: '-1px', color: '#fff', marginBottom: 14 }}>{c.cta.h}</h2>
          <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 36, lineHeight: 1.75, maxWidth: 460, margin: '0 auto 36px' }}>{c.cta.p}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={open} className="btn btn-white" style={{ padding: '13px 30px', fontSize: 15 }}>{c.cta.b1} →</button>
            <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'rgba(255,255,255,0.14)'; a.style.color = '#fff' }}
              onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'rgba(255,255,255,0.08)'; a.style.color = '#94a3b8' }}
            >{c.cta.b2}</a>
          </div>
          <p style={{ color: '#1e4d39', fontSize: 12, marginTop: 22 }}>{c.cta.wallets}</p>
        </motion.div>
      </section>

      {/* ══ FAQ ══ */}
      <SectionWrap id="faq" bg="#06101a" border={false}>
        <SectionHead tag={c.faq.tag} title={c.faq.h} sub={c.faq.p} center dark />
        <motion.div key={lang + '-faq'} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {c.faq.items.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
        </motion.div>
      </SectionWrap>

      {/* ══ FOOTER ══ */}
      <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/vend-logo.png" alt="VendChain" height={40} width={40} style={{ display: 'block', objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>VendChain</span>
            <span style={{ color: '#334155', fontSize: 12, marginLeft: 4 }}>&copy; 2026</span>
          </div>
          <div style={{ color: '#334155', fontSize: 12 }}>{c.footer.built}</div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            {c.footer.links.map(l => (
              <a key={l} href="#" style={{ color: '#334155', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#10b981' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#334155' }}
              >{l}</a>
            ))}
            <button onClick={toggleLang} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 0.5 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#10b981' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569' }}
            >{lang === 'ru' ? 'EN' : 'RU'}</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
