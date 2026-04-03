/**
 * Эмулятор дохода машин — запускается по cron каждые 6 часов.
 * Читает daily_avg из Supabase, считает долю за 6ч, конвертирует в VEND,
 * переводит токены из deployer кошелька в reward_vault.
 *
 * Логика:
 *   revenue_6h = daily_avg * (6/24) * random(0.8..1.2)   — случайный шум ±20%
 *   total_usd  = сумма по всем ONLINE машинам
 *   vend_amount = total_usd / VEND_PRICE_USD              — по текущей цене
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { getOrCreateAssociatedTokenAccount, transfer, getAccount } from '@solana/spl-token'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const RPC_URL    = 'https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39'
const PROGRAM_ID = new PublicKey('9T4YTDnoA1KQyVmcyEqJug5jWkXEjyi6WLw2uKr9kowK')
const VEND_MINT  = new PublicKey('4nr5wxpSUUZKpePSu8S5MDSRPd5EZ4Lm67S97EGrLY4B')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Цена VEND: 1 SOL = 50,000 VEND, 1 SOL ≈ $150 → $0.003 за VEND
const VEND_PRICE_USD = 0.003
const MAX_EMIT_VEND  = 200   // максимум за один запуск (5000 VEND хватит на ~25 запусков)
const HOURS = 6
const DECIMALS = 1_000_000

function randomNoise(): number {
  return 0.8 + Math.random() * 0.4 // 0.8 .. 1.2
}

async function main() {
  console.log(`\n=== VendChain Reward Emitter (${new Date().toISOString()}) ===`)

  const conn = new Connection(RPC_URL, 'confirmed')

  // Загружаем keypair
  const keypairPaths = ['C:/solana/id.json', `${process.env.HOME}/.config/solana/id.json`]
  let payer: Keypair | null = null
  for (const p of keypairPaths) {
    if (fs.existsSync(p)) {
      payer = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(p, 'utf-8'))))
      break
    }
  }
  if (!payer) throw new Error('Keypair not found')
  console.log('Payer:', payer.publicKey.toBase58())

  // Читаем только ONLINE машины из Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: machines, error } = await supabase
    .from('machines')
    .select('machine_id, daily_avg, status')
    .eq('status', 'ONLINE')
  if (error) throw new Error(`Supabase error: ${error.message}`)
  if (!machines?.length) {
    console.log('No ONLINE machines found, skipping emission.')
    return
  }
  console.log(`Found ${machines.length} ONLINE machine(s)`)

  // Считаем выручку за 6 часов
  let totalUsd = 0
  for (const m of machines) {
    const revenue6h = (m.daily_avg * (HOURS / 24)) * randomNoise()
    totalUsd += revenue6h
    console.log(`  ${m.machine_id}: $${revenue6h.toFixed(2)} (6h)`)
  }
  console.log(`Total revenue (6h): $${totalUsd.toFixed(2)}`)

  // Конвертируем в VEND, применяем лимит MAX_EMIT_VEND
  const rawVend = (totalUsd / VEND_PRICE_USD)
  const cappedVend = Math.min(rawVend, MAX_EMIT_VEND)
  const vendAmount = Math.floor(cappedVend * DECIMALS)
  console.log(`VEND to emit: ${cappedVend.toFixed(2)} VEND (raw: ${rawVend.toFixed(2)}, cap: ${MAX_EMIT_VEND})`)

  if (vendAmount <= 0) {
    console.log('Nothing to emit, exiting.')
    return
  }

  // Проверяем баланс deployer кошелька
  const [rewardVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_vault_v2')], PROGRAM_ID
  )
  const payerAta = await getOrCreateAssociatedTokenAccount(conn, payer, VEND_MINT, payer.publicKey)
  console.log(`Payer VEND balance: ${Number(payerAta.amount) / DECIMALS}`)

  if (Number(payerAta.amount) < vendAmount) {
    console.warn(`⚠️  Insufficient VEND in deployer wallet. Need ${vendAmount / DECIMALS}, have ${Number(payerAta.amount) / DECIMALS}`)
    console.warn('Run: npx tsx scripts/airdrop-vend.ts <deployer_address>')
    process.exit(1)
  }

  // Переводим VEND в reward vault
  const sig = await transfer(conn, payer, payerAta.address, rewardVault, payer, vendAmount)
  console.log(`✅ Emitted ${(vendAmount / DECIMALS).toFixed(2)} VEND → reward vault`)
  console.log(`   Signature: ${sig}`)

  const vaultAfter = await getAccount(conn, rewardVault)
  console.log(`   Vault balance: ${Number(vaultAfter.amount) / DECIMALS} VEND`)
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
