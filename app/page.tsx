'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const TICKER = [
  'VM-ALM-001 · Coca-Cola 0.5л · +350₸',
  'VM-ALM-002 · Питьевая вода · +200₸',
  'Выплата: 0.0012 SOL -> 28 держателям',
  'VM-ALM-003 · Lays Краб · +450₸',
  'Новый инвестор · 500 VEND куплено',
  'VM-ALM-001 · Red Bull · +600₸',
  'Выплата: 0.0021 SOL -> 28 держателям',
  'VM-ALM-002 · Snickers · +380₸',
]

const FEATURES = [
  { icon: '◈', title: 'Токенизация активов', desc: 'Каждый VEND-токен закреплён за реальным пулом вендинговых автоматов. Юридически оформленная долевая собственность через SPV.' },
  { icon: '⟳', title: 'Автоматические выплаты', desc: 'Смарт-контракт Solana распределяет доход от продаж пропорционально токенам. Без посредников, без задержек.' },
  { icon: '◎', title: 'On-chain прозрачность', desc: 'Каждая транзакция от продажи до выплаты записана в блокчейне. Проверяй в любое время через Solana Explorer.' },
  { icon: '⬡', title: 'Вторичный рынок', desc: 'Продай долю в любой момент. Ликвидность обеспечивается через торговлю VEND-токенами между участниками платформы.' },
  { icon: '⊕', title: 'Низкий порог входа', desc: 'Начни с любой суммы от $10. Диверсификация по всему пулу автоматов снижает риски отдельной точки.' },
  { icon: '⚙', title: 'IoT + Oracle интеграция', desc: 'Автоматы передают данные о продажах через оракул в смарт-контракт. Данные верифицируются через платёжные системы.' },
]

const STATS = [
  { value: '3', label: 'Автомата в сети' },
  { value: '$142', label: 'Доход за 24 часа' },
  { value: '18.4%', label: 'Годовая доходность' },
  { value: '28', label: 'Инвесторов' },
]

const FAQS = [
  { q: 'Что обеспечивает ценность VEND-токена?', a: 'Каждый токен юридически привязан к пулу вендинговых автоматов через SPV-структуру. Держатель токена имеет право на долю дохода пропорционально своей доле.' },
  { q: 'Как часто выплачивается доход?', a: 'Смарт-контракт накапливает доход с каждой продажи. Вы можете забрать накопленное в любое время — комиссия Solana составляет менее $0.01.' },
  { q: 'Что происходит при добавлении новых автоматов?', a: 'Доход новых машин автоматически добавляется в общий пул. Держатели существующих токенов получают выгоду без необходимости покупать новые токены.' },
  { q: 'Можно ли продать токены?', a: 'Да, VEND-токены торгуются на вторичном рынке между участниками платформы. Ликвидность обеспечивается через Solana.' },
  { q: 'Нужна ли верификация личности (KYC)?', a: 'Для входа нужен только криптокошелёк. Никаких форм, email-регистрации или документов. Всё управляется on-chain.' },
  { q: 'Какие кошельки поддерживаются?', a: 'Phantom, Solflare и Backpack. Все три работают на Solana и поддерживают подпись транзакций без передачи приватного ключа.' },
]

export default function LandingPage() {
  const { connected } = useWallet()
  const { setVisible } = useWalletModal()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (connected && mounted) router.push('/profile')
  }, [connected, mounted, router])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const openWallet = () => setVisible(true)

  return (
    <div style={{ background: '#0d0d14', minHeight: '100vh', color: '#fff' }}>

      {/* ── NAV — fixed, фон появляется при скролле ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%', height: 68,
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(10,10,18,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
      }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {/* SVG logo */}
          <img src="/logo.svg" alt="VendChain" width={36} height={36} style={{ display: 'block' }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.3px' }}>VendChain</span>
        </a>

        {/* Right side */}
        {mounted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: '#94a3b8',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7, padding: '6px 12px',
              backdropFilter: 'blur(8px)',
            }}>
              <span className="pulse-dot" style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
              Solana Devnet
            </div>
            <button onClick={openWallet} className="btn btn-solid" style={{ padding: '10px 22px', fontSize: 14 }}>
              {connected ? 'Открыть кабинет' : 'Войти в платформу'}
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden', marginTop: 0 }}>
        {/* BG photo */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("https://watcher.guru/news/wp-content/uploads/2024/08/Solana-logo.jpg")',
          backgroundSize: 'cover', backgroundPosition: '-500% center',
        }} />
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(13,13,20,0.92) 50%, rgba(13,13,20,0.55) 100%)',
        }} />
        {/* Bottom fade to bg color */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(to bottom, transparent, #0d0d14)',
        }} />
        {/* Left accent bar */}
        <div style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3, background: 'linear-gradient(to bottom, transparent, #4f46e5, #7c3aed, transparent)',
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, padding: '100px 6% 80px' }} className="fade-up">
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 6, padding: '6px 16px', marginBottom: 32,
            fontSize: 11, color: '#a5b4fc', fontWeight: 600,
            letterSpacing: 1.5, textTransform: 'uppercase' as const,
          }}>
            <span className="pulse-dot" style={{ width: 5, height: 5, background: '#818cf8', borderRadius: '50%', display: 'inline-block' }} />
            RWA &nbsp;·&nbsp; Solana Blockchain &nbsp;·&nbsp; Real Yield
          </div>

          <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 50px)', fontWeight: 800, lineHeight: 1.08, marginBottom: 28, letterSpacing: '-1.5px' }}>
            Инвестируй в сеть<br />
            <span className="grad">вендинговых автоматов</span><br />
            <span style={{ color: '#e2e8f0' }}>и зарабатывай каждый день</span>
          </h1>

          <p style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.75, marginBottom: 44, maxWidth: 540 }}>
            VendChain — первая платформа токенизации реальных активов на Solana.
            Покупай долю в пуле физических машин от{' '}
            <strong style={{ color: '#fff' }}>$10</strong>{' '}
            и получай доход с каждой продажи автоматически.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, marginBottom: 52 }}>
            <button onClick={openWallet} className="btn btn-hero">
              Войти в платформу &rarr;
            </button>
            <a href="#how" className="btn btn-outline">Как это работает</a>
          </div>

          {/* Trust bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' as const }}>
            {['Solana Foundation', 'SPV Structure', 'On-chain Audit'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#64748b' }}>
                <span style={{ color: '#6366f1', fontSize: 14 }}>&#10003;</span> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TICKER — после hero, как поставил пользователь ── */}
      <div style={{
        background: '#080810',
        borderTop: '1px solid rgba(99,102,241,0.2)',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        padding: '10px 0', overflow: 'hidden',
      }}>
        <div className="ticker" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} style={{ padding: '0 44px', fontSize: '12px', color: '#475569', fontFamily: 'monospace', letterSpacing: 0.3 }}>
              <span style={{ color: '#4f46e5', marginRight: 10 }}>◆</span>{t}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section id="stats" style={{
        background: 'linear-gradient(180deg, rgba(79,70,229,0.07) 0%, rgba(13,13,20,0) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5%', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '36px 16px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }} className="grad">{s.value}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 8, letterSpacing: 0.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS — фон: тёмная сетка ── */}
      <section id="how" style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,70,229,0.12) 0%, transparent 70%),
          #0d0d14
        `,
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,70,229,0.12) 0%, transparent 70%),
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, 48px 48px, 48px 48px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 5%' }}>
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap' as const, gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 12 }}>Как это работает</h2>
              <p style={{ color: '#64748b', fontSize: 15, maxWidth: 440, lineHeight: 1.7 }}>
                Три простых шага от подключения кошелька до получения пассивного дохода
              </p>
            </div>
            <a href="#features" className="btn btn-outline" style={{ fontSize: 13 }}>Все возможности &rarr;</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { n: '01', color: '#4f46e5', title: 'Подключи кошелёк', desc: 'Войди через Phantom, Solflare или Backpack. Никакой регистрации — только подпись транзакции.' },
              { n: '02', color: '#7c3aed', title: 'Купи долю в пуле', desc: 'Приобрети VEND-токены. Каждый токен закрепляет твоё право на долю дохода всей сети автоматов.' },
              { n: '03', color: '#6366f1', title: 'Получай доход', desc: 'Смарт-контракт автоматически распределяет выручку. Забирай начисленный доход в любое время.' },
            ].map((s) => (
              <div key={s.n} className="card" style={{ padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: 16, right: 20,
                  fontSize: 64, fontWeight: 900, color: s.color, opacity: 0.06, lineHeight: 1, userSelect: 'none',
                }}>{s.n}</div>
                <div style={{
                  width: 44, height: 44, borderRadius: 11,
                  background: `${s.color}20`, border: `1px solid ${s.color}45`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.color, fontWeight: 800, fontSize: 14, marginBottom: 24,
                }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.75 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — фон: тёмно-синеватый ── */}
      <section id="features" style={{
        background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d16 100%)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 5%' }}>
          <div className="divider" />
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 12 }}>Возможности платформы</h2>
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 56, maxWidth: 480, lineHeight: 1.7 }}>
            Полная инфраструктура для инвестирования в реальные активы через блокчейн
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="card" style={{ padding: '28px 26px', display: 'flex', gap: 20 }}>
                <div className="icon-box" style={{ color: '#818cf8', fontSize: 20 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.75 }}>{f.desc}</p>
                  <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6366f1', fontSize: 12, marginTop: 14, textDecoration: 'none', fontWeight: 500 }}>
                    Подробнее &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT — фон: тёмный с правым свечением ── */}
      <section id="about" style={{
        background: `radial-gradient(ellipse 60% 80% at 100% 50%, rgba(79,70,229,0.08) 0%, transparent 60%), #0d0d14`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
            {/* Photo */}
            <div style={{ position: 'relative' }}>
              <div style={{
                borderRadius: 18, overflow: 'hidden',
                border: '1px solid rgba(99,102,241,0.2)',
                aspectRatio: '4/3',
                backgroundImage: 'url("https://newsbit.nl/app/uploads/2022/09/AdobeStock_524936362-scaled.webp")',
                backgroundSize: 'cover', backgroundPosition: 'center',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
              }} />
              {/* Floating badge */}
              <div className="card-accent" style={{ position: 'absolute', bottom: -24, right: -24, padding: '18px 22px', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
                <div style={{ fontSize: 26, fontWeight: 800 }} className="grad">$142 / день</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Средний доход пула</div>
              </div>
            </div>

            {/* Text */}
            <div>
              <div className="divider" />
              <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 24, lineHeight: 1.2 }}>
                О платформе VendChain
              </h2>
              <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 20, fontSize: 15 }}>
                VendChain — инфраструктура для токенизации физических активов на блокчейне Solana. Мы начали с вендинговых автоматов как понятного и предсказуемого актива с ежедневным cashflow.
              </p>
              <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 36, fontSize: 15 }}>
                Наша миссия — открыть доступ к реальным инвестициям для любого человека с суммой от $10, сохранив при этом полную прозрачность через блокчейн.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
                {[
                  { v: '100%', l: 'On-chain операции' },
                  { v: '< $0.01', l: 'Комиссия за выплату' },
                  { v: 'Ежедневно', l: 'Частота выплат' },
                  { v: 'SPV', l: 'Юридическая структура' },
                ].map(s => (
                  <div key={s.l} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: 700, fontSize: 19, color: '#818cf8' }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <button onClick={openWallet} className="btn btn-solid" style={{ padding: '13px 30px' }}>
                Начать инвестировать
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — фон: насыщенный индиго-градиент ── */}
      <section style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)',
        borderTop: '1px solid rgba(99,102,241,0.3)',
        borderBottom: '1px solid rgba(99,102,241,0.3)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '88px 5%', textAlign: 'center' as const }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 18 }}>Готов начать?</h2>
          <p style={{ color: '#a5b4fc', fontSize: 17, marginBottom: 40, lineHeight: 1.75 }}>
            Подключи кошелёк и войди в платформу за 30 секунд.
            Поддерживаются Phantom, Solflare и Backpack.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <button onClick={openWallet} style={{
              background: '#fff', color: '#1e1b4b',
              borderRadius: 9, padding: '14px 32px', fontWeight: 700, fontSize: 15,
              border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e0e7ff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
            >
              Войти в платформу &rarr;
            </button>
            <a href="#how" className="btn" style={{
              background: 'rgba(255,255,255,0.1)', color: '#c7d2fe',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 9, padding: '13px 28px', fontSize: 15,
            }}>
              Узнать больше
            </a>
          </div>
          <p style={{ color: '#6366f1', fontSize: 12, marginTop: 24, opacity: 0.7 }}>
            Phantom &nbsp;·&nbsp; Solflare &nbsp;·&nbsp; Backpack
          </p>
        </div>
      </section>

      {/* ── FAQ — 2 колонки ── */}
      <section id="faq" style={{
        background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d14 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 5%' }}>
          <div className="divider" />
          <h2 style={{ fontSize: 34, fontWeight: 800, marginBottom: 14 }}>Часто задаваемые вопросы</h2>
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 52, lineHeight: 1.7 }}>
            Всё что нужно знать перед первой инвестицией
          </p>
          {/* 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="card" style={{ padding: '24px 26px' }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{
                    color: '#4f46e5', flexShrink: 0, fontSize: 12, fontWeight: 700,
                    background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)',
                    borderRadius: 5, padding: '2px 7px', marginTop: 2,
                  }}>Q</span>
                  {faq.q}
                </div>
                <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.75, paddingLeft: 32 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#080810',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '40px 5%',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.svg" alt="VendChain" width={36} height={36} style={{ display: 'block' }} />
            <span style={{ fontWeight: 700, color: '#fff' }}>VendChain</span>
            <span style={{ color: '#1e293b', fontSize: 13 }}>&copy; 2026</span>
          </div>
          <div style={{ color: '#1e293b', fontSize: 13 }}>
            Built on Solana &nbsp;·&nbsp; National Solana Hackathon 2026 &nbsp;·&nbsp; Decentrathon
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            {['GitHub', 'Docs', 'Twitter'].map(l => (
              <a key={l} href="#" style={{ color: '#334155', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#818cf8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#334155' }}
              >{l}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
