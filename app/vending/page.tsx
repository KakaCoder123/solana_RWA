'use client'

import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { getAssociatedTokenAddressSync, getAccount, createTransferInstruction } from '@solana/spl-token'
import { Transaction } from '@solana/web3.js'
import NavBar from '@/components/NavBar'
import IDL from '@/lib/idl/vend_machine.json'

// ── Constants ──────────────────────────────────────────────────
const VEND_PER_TENGE = 1 / 50   // 1 VEND = 50₸
const MACHINE_ID = 'VC-9928'
const VEND_MACHINE_PROGRAM_ID = new PublicKey('Ewcmz7Bvxm74hGB8op7j1jVTmP8QKyRAe82BoWMWAeke')
const VEND_MINT = new PublicKey('4nr5wxpSUUZKpePSu8S5MDSRPd5EZ4Lm67S97EGrLY4B')
// Treasury = deployer wallet (принимает VEND за покупки)
const TREASURY = new PublicKey('2Xxc4uMPpfGJJtxEXV2SfP34tQ8n56mYZEw26n79LPaw')

function strTo16Bytes(s: string): Uint8Array {
  const arr = new Uint8Array(16).fill(0)
  new TextEncoder().encode(s).forEach((b, i) => { if (i < 16) arr[i] = b })
  return arr
}

const [registryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('machine_registry')], VEND_MACHINE_PROGRAM_ID
)
const [machinePda] = PublicKey.findProgramAddressSync(
  [Buffer.from('machine'), strTo16Bytes(MACHINE_ID)], VEND_MACHINE_PROGRAM_ID
)

// ── Types ──────────────────────────────────────────────────────
interface Product {
  code: string
  name: string
  short: string
  price: number   // ₸
  icon: string
  empty: boolean
}
interface LedgerEntry { label: string; amount: string; pending: boolean }

// ── Products (5 rows × 4 cols) ─────────────────────────────────
const PRODUCTS: Product[] = [
  { code:'A1', name:'Coca-Cola 0.5л',        short:'Cola',       price:350, icon:'🥤', empty:false },
  { code:'A2', name:'Питьевая вода 0.5л',    short:'Вода',       price:200, icon:'💧', empty:false },
  { code:'A3', name:'Red Bull 0.25л',         short:'Red Bull',   price:600, icon:'⚡', empty:false },
  { code:'A4', name:'Sprite 0.5л',            short:'Sprite',     price:350, icon:'🫧', empty:false },

  { code:'B1', name:'Lays Краб 60г',          short:'Lays',       price:450, icon:'🍟', empty:false },
  { code:'B2', name:'Lipton Зелёный',         short:'Lipton',     price:180, icon:'🍵', empty:false },
  { code:'B3', name:'ПУСТО',                  short:'ПУСТО',      price:0,   icon:'',   empty:true  },
  { code:'B4', name:'Snickers 50г',           short:'Snickers',   price:380, icon:'🍫', empty:false },

  { code:'C1', name:'Печенье Юбилейное',      short:'Печенье',    price:220, icon:'🍪', empty:false },
  { code:'C2', name:'Чай Greenfield',         short:'Чай',        price:160, icon:'🍃', empty:false },
  { code:'C3', name:'Bounty 57г',             short:'Bounty',     price:320, icon:'🍬', empty:false },
  { code:'C4', name:'Twix 58г',               short:'Twix',       price:320, icon:'🍭', empty:false },

  { code:'D1', name:'Сок Rich Яблоко 0.2л',  short:'Сок Rich',   price:280, icon:'🧃', empty:false },
  { code:'D2', name:'Nescafe 3в1',            short:'Nescafe',    price:150, icon:'☕', empty:false },
  { code:'D3', name:'Жвачка Orbit',           short:'Orbit',      price:120, icon:'💚', empty:false },
  { code:'D4', name:'Oreo 95г',               short:'Oreo',       price:260, icon:'🍩', empty:false },

  { code:'E1', name:'Мороженое Пломбир',      short:'Пломбир',    price:420, icon:'🍦', empty:false },
  { code:'E2', name:'Fanta 0.5л',             short:'Fanta',      price:350, icon:'🍊', empty:false },
  { code:'E3', name:'Pepsi 0.5л',             short:'Pepsi',      price:350, icon:'🥤', empty:false },
  { code:'E4', name:'Энергетик Burn',         short:'Burn',       price:500, icon:'🔋', empty:false },
]

const ROWS = ['A','B','C','D','E']
const COLS = ['1','2','3','4']

function getProduct(row: string, col: string) {
  return PRODUCTS.find(p => p.code === row + col) ?? null
}

// ── Live clock ─────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toUTCString().slice(17, 25) + ' UTC')
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])
  return time
}

// ── Page ───────────────────────────────────────────────────────
export default function VendingPage() {
  const { connected, connecting, publicKey } = useWallet()
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const [selRow, setSelRow] = useState<string | null>(null)
  const [selCol, setSelCol] = useState<string | null>(null)
  const [vendBal, setVendBal] = useState(0)
  const [sessionRev, setSessionRev] = useState(420.69)
  const [dispensed, setDispensed] = useState<Product | null>(null)
  const [dispensing, setDispensing] = useState(false)
  const [saleNotif, setSaleNotif] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([
    { label: 'A1 PURCHASE', amount: '0.0042 SOL', pending: false },
    { label: 'B4 PURCHASE', amount: '0.018 SOL',  pending: false },
    { label: 'REFILL REQ',  amount: 'PENDING',    pending: true  },
  ])
  const [termLines, setTermLines] = useState([
    '> READY FOR SELECTION',
    '> WALLET CONNECTED',
    `> BALANCE: ${(8.40).toFixed(2)} VEND`,
    '> STATUS: NOMINAL',
  ])

  const clock = useClock()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted && !connecting && !connected) router.push('/')
  }, [mounted, connecting, connected, router])

  // Load real VEND balance
  useEffect(() => {
    if (!publicKey) return
    const ata = getAssociatedTokenAddressSync(VEND_MINT, publicKey)
    getAccount(connection, ata)
      .then(acc => setVendBal(Number(acc.amount) / 1_000_000))
      .catch(() => setVendBal(0))
  }, [publicKey, connection])

  const addTermLine = useCallback((line: string) => {
    setTermLines(prev => [...prev.slice(-8), line])
  }, [])

  const selCode = selRow && selCol ? selRow + selCol : null
  const selProduct = selRow && selCol ? getProduct(selRow, selCol) : null

  // ── Background "other customers" simulation ──
  useEffect(() => {
    if (!mounted) return
    const items = PRODUCTS.filter(p => !p.empty)
    const iv = setInterval(() => {
      const p = items[Math.floor(Math.random() * items.length)]
      const sol = (p.price * 0.000014).toFixed(4)
      setLedger(prev => [{ label: `${p.code} PURCHASE`, amount: `${sol} SOL`, pending: false }, ...prev.slice(0, 4)])
      setSessionRev(prev => +(prev + p.price * 0.15).toFixed(2))
    }, 6000)
    return () => clearInterval(iv)
  }, [mounted])

  // ── Handle purchase ────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!selProduct) { setError('Выберите товар'); return }
    if (selProduct.empty) { setError('Слот пуст'); return }
    const cost = +(selProduct.price * VEND_PER_TENGE).toFixed(2)
    if (vendBal < cost) { setError(`Недостаточно VEND (нужно ${cost})`); return }

    setError(null)
    setDispensing(true)
    addTermLine(`> DISPENSING: ${selProduct.name}`)
    addTermLine(`> PRICE: ${selProduct.price}₸ / ${cost} VEND`)

    try {
      if (!anchorWallet) throw new Error('Wallet not connected')

      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const program = new Program(IDL as any, provider)

      const userAta = getAssociatedTokenAddressSync(VEND_MINT, anchorWallet.publicKey)
      const treasuryAta = getAssociatedTokenAddressSync(VEND_MINT, TREASURY)
      const vendRaw = Math.floor(cost * 1_000_000)

      // Собираем одну транзакцию: record_sale + VEND transfer
      const amountLamports = new BN(Math.floor(selProduct.price * 14000))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordSaleTx = await (program.methods as any).recordSale(amountLamports).accounts({
        buyer: anchorWallet.publicKey,
        registry: registryPda,
        machine: machinePda,
      }).transaction()

      const transferIx = createTransferInstruction(userAta, treasuryAta, anchorWallet.publicKey, vendRaw)
      recordSaleTx.add(transferIx)

      const sig = await provider.sendAndConfirm(recordSaleTx)
      addTermLine(`> TX: ${sig.slice(0, 20)}...`)

      // Обновляем реальный баланс с блокчейна
      const ataAcc = await getAccount(connection, userAta)
      setVendBal(Number(ataAcc.amount) / 1_000_000)

      setSessionRev(prev => +(prev + selProduct.price).toFixed(2))
      setDispensed(selProduct)
      setSaleNotif(true)
      addTermLine(`> CONFIRMED ON-CHAIN`)
      addTermLine(`> -${cost} VEND SPENT`)
      const sol = (selProduct.price * 0.000014).toFixed(4)
      setLedger(prev => [{ label: `${selProduct.code} PURCHASE`, amount: `${sol} SOL`, pending: false }, ...prev.slice(0, 4)])
      setSelRow(null); setSelCol(null)
      setTimeout(() => { setSaleNotif(false); setDispensed(null) }, 3500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 80) : 'Transaction failed')
      addTermLine(`> ERROR: TX FAILED`)
    } finally {
      setDispensing(false)
    }
  }

  if (!mounted || connecting) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569', fontSize: 14 }}>Загрузка...</div>
    </div>
  )
  if (!connected) return null

  const vendLow = vendBal < 5
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Machine ID */}
          <div style={{ ...card, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1 }}>MACHINE ID</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#14F195', fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14F195', display: 'inline-block' }} className="pulse-dot" />
                {MACHINE_ID}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>SESSION REVENUE</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{sessionRev.toFixed(2)} <span style={{ fontSize: 16, color: '#9945FF' }}>₸</span></div>
              <div style={{ fontSize: 12, color: '#14F195', marginTop: 4 }}>↑ +12% from last epoch</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>VEND Balance</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: vendLow ? '#ef4444' : '#14F195' }}>
                  {vendLow ? 'LOW' : 'OK'}
                </span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min(100, (vendBal / 20) * 100)}%`,
                  background: vendLow ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #14F195)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontFamily: 'monospace' }}>
                {vendBal.toFixed(2)} VEND
              </div>
            </div>

            <button style={{
              width: '100%', padding: '10px', borderRadius: 9, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              ⬆ Top up VEND
            </button>
          </div>

          {/* Emulation Logic */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#818cf8', flexShrink: 0,
              }}>ℹ</span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Emulation Logic</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.75, marginBottom: 16 }}>
              Каждая покупка отражает реальную механику на блокчейне. Выручка в ₸ мгновенно конвертируется и направляется в глобальный пул ликвидности.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: 'Execution Latency', v: '42ms', c: '#14F195' },
                { l: 'Network', v: 'Solana Devnet', c: '#fff' },
                { l: 'Курс VEND', v: '1 VEND = 50₸', c: '#818cf8' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>{l}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CENTER: MACHINE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Machine body */}
          <div style={{
            background: 'linear-gradient(180deg, #0f0f1a 0%, #0a0a12 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24, overflow: 'hidden',
            boxShadow: '0 0 60px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            {/* Machine top bar */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '10px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB800' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#14F195' }} />
              <span style={{ fontSize: 11, color: '#334155', marginLeft: 8, fontFamily: 'monospace' }}>
                VendChain Emulator v2.1 — {MACHINE_ID}
              </span>
            </div>

            {/* Product grid */}
            <div style={{ padding: '16px 20px' }}>
              {ROWS.map(row => (
                <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                  {COLS.map(col => {
                    const p = getProduct(row, col)!
                    const isSelected = selCode === p.code
                    const isDispensing = dispensing && selCode === p.code

                    return (
                      <button key={col} onClick={() => {
                        if (p.empty) return
                        setSelRow(row); setSelCol(col); setError(null)
                      }} style={{
                        background: p.empty
                          ? 'rgba(255,255,255,0.01)'
                          : isSelected
                            ? 'rgba(99,102,241,0.2)'
                            : 'rgba(255,255,255,0.04)',
                        border: isSelected
                          ? '1px solid rgba(99,102,241,0.6)'
                          : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10, padding: '10px 6px',
                        cursor: p.empty ? 'default' : 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                        opacity: isDispensing ? 0.3 : 1,
                        boxShadow: isSelected ? '0 0 16px rgba(99,102,241,0.3)' : 'none',
                      }}
                        onMouseEnter={e => { if (!p.empty && !isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                        onMouseLeave={e => { if (!p.empty && !isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      >
                        <span style={{ fontSize: p.empty ? 14 : 22, opacity: p.empty ? 0.2 : 1, lineHeight: 1 }}>
                          {p.empty ? '∅' : p.icon}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: p.empty ? '#334155' : '#64748b', fontWeight: 700 }}>
                          {p.code}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          color: p.empty ? '#334155' : isSelected ? '#fff' : '#94a3b8',
                        }}>
                          {p.empty ? 'ПУСТО' : `${p.price}₸`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}

              {/* Dispenser slot */}
              <div style={{
                marginTop: 4,
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                minHeight: 52,
                background: dispensed ? 'rgba(20,241,149,0.05)' : 'rgba(255,255,255,0.01)',
                transition: 'background 0.4s',
              }}>
                {dispensed ? (
                  <>
                    <span style={{ fontSize: 8, color: '#14F195', fontFamily: 'monospace', letterSpacing: 1 }}>← PUSH TO RETRIEVE</span>
                    <span style={{ fontSize: 24 }}>{dispensed.icon}</span>
                    <span style={{ fontSize: 12, color: '#14F195', fontWeight: 700 }}>{dispensed.name}</span>
                    <span style={{ fontSize: 8, color: '#14F195', fontFamily: 'monospace', letterSpacing: 1 }}>RETRIEVE →</span>
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: '#1e293b', fontFamily: 'monospace', letterSpacing: 2 }}>
                    DISPENSER SLOT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'TOTAL POOL', value: '1.2M ₸' },
              { label: 'CIRCULATING', value: '842K VEND' },
            ].map(({ label, value }) => (
              <div key={label} style={{ ...card, padding: '18px 22px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Terminal */}
          <div style={{
            background: '#060d08',
            border: '1px solid rgba(20,241,149,0.2)',
            borderRadius: 14, padding: '14px 16px',
            fontFamily: 'monospace',
          }}>
            {/* Terminal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ background: 'rgba(20,241,149,0.15)', border: '1px solid rgba(20,241,149,0.3)', borderRadius: 5, padding: '2px 8px', fontSize: 10, color: '#14F195', fontWeight: 700, letterSpacing: 1 }}>ONLINE</div>
              <span style={{ fontSize: 10, color: '#14F195', opacity: 0.6 }}>{clock}</span>
            </div>
            {/* Lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: 110 }}>
              {termLines.slice(-6).map((line, i) => (
                <div key={i} style={{ fontSize: 11, color: '#14F195', opacity: 0.5 + i * 0.08, letterSpacing: 0.3 }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Selected item display */}
          <div style={{ ...card, padding: '12px 16px', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selProduct ? (
              <div style={{ textAlign: 'center' as const }}>
                <span style={{ fontSize: 11, color: '#818cf8', fontFamily: 'monospace', fontWeight: 700 }}>{selProduct.code}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', margin: '0 8px' }}>—</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{selProduct.name}</span>
                <span style={{ fontSize: 13, color: '#14F195', fontWeight: 900, marginLeft: 8 }}>{selProduct.price}₸</span>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                  ≈ {(selProduct.price * VEND_PER_TENGE).toFixed(2)} VEND
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace', letterSpacing: 1 }}>NO SELECTION</span>
            )}
          </div>

          {/* Keypad */}
          <div style={{ ...card, padding: '16px' }}>
            {/* Row buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 8 }}>
              {ROWS.map(r => (
                <button key={r} onClick={() => { setSelRow(r); setSelCol(null); setError(null) }} style={{
                  padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800,
                  background: selRow === r ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selRow === r ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                  color: selRow === r ? '#fff' : '#64748b',
                  transition: 'all 0.15s',
                }}>{r}</button>
              ))}
            </div>
            {/* Col buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {COLS.map(c => (
                <button key={c} onClick={() => { setSelCol(c); setError(null) }} style={{
                  padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800,
                  background: selCol === c ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selCol === c ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                  color: selCol === c ? '#fff' : '#64748b',
                  transition: 'all 0.15s',
                }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}>
              ⚠ {error}
            </div>
          )}

          {/* Purchase button */}
          <button onClick={handlePurchase} disabled={dispensing || !selCode} style={{
            width: '100%', padding: '14px', borderRadius: 10, cursor: dispensing || !selCode ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 900, letterSpacing: 1.5,
            background: dispensing
              ? 'rgba(99,102,241,0.3)'
              : !selCode
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, #6366f1, #9945FF)',
            border: 'none',
            color: !selCode ? '#334155' : '#fff',
            transition: 'all 0.2s',
          }}>
            {dispensing ? '⏳ DISPENSING...' : 'PURCHASE SELECTION'}
          </button>

          {/* Sale notification */}
          {saleNotif && (
            <div className="fade-up" style={{
              background: 'rgba(20,241,149,0.06)',
              border: '1px solid rgba(20,241,149,0.3)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(20,241,149,0.15)', border: '1px solid #14F195',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#14F195', fontSize: 14, flexShrink: 0,
              }}>✓</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Sale reflected in pool</div>
                <div style={{ fontSize: 11, color: '#475569' }}>+0.05 VEND Fee Burnt</div>
              </div>
            </div>
          )}

          {/* Live Ledger */}
          <div style={{ ...card, padding: '16px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>LIVE LEDGER</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ledger.slice(0, 4).map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{e.label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: e.pending ? '#475569' : '#14F195' }}>
                    {e.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
