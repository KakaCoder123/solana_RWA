/**
 * Mint test VEND tokens to any Phantom wallet address on Devnet.
 * Usage: npx ts-node scripts/airdrop-vend.ts <RECIPIENT_ADDRESS>
 *
 * Requires: C:\solana\id.json (mint authority keypair)
 */

import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js'
import {
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as path from 'path'

const IDL = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/idl/vendchain_contracts.json'), 'utf8'))

const PROGRAM_ID = new PublicKey('9T4YTDnoA1KQyVmcyEqJug5jWkXEjyi6WLw2uKr9kowK')
const AMOUNT = 50_000 * 1_000_000 // 50,000 VEND (6 decimals)

async function main() {
  const recipientArg = process.argv[2]
  if (!recipientArg) {
    console.error('Usage: npx ts-node scripts/airdrop-vend.ts <RECIPIENT_ADDRESS>')
    process.exit(1)
  }

  const recipient = new PublicKey(recipientArg)
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

  // Load authority keypair (mint authority)
  const keypairPath = 'C:\\solana\\id.json'
  const rawKey = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
  const authority = Keypair.fromSecretKey(new Uint8Array(rawKey))

  console.log('Authority:', authority.publicKey.toBase58())
  console.log('Recipient:', recipient.toBase58())

  // Read VEND mint from staking pool
  const provider = new AnchorProvider(
    connection,
    { publicKey: authority.publicKey, signTransaction: async (t) => { (t as any).sign([authority]); return t }, signAllTransactions: async (ts) => { ts.forEach(t => (t as any).sign([authority])); return ts } },
    { commitment: 'confirmed' }
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(IDL as any, provider)

  const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from('staking_pool')], PROGRAM_ID)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = await (program.account as any).stakingPool.fetch(poolPda)
  const vendMint: PublicKey = pool.vendMint

  console.log('VEND mint:', vendMint.toBase58())

  // Create/get recipient ATA and mint tokens
  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection,
    authority,
    vendMint,
    recipient
  )

  await mintTo(
    connection,
    authority,
    vendMint,
    recipientAta.address,
    authority, // mint authority
    AMOUNT
  )

  console.log(`\n✅ Minted ${AMOUNT / 1_000_000} VEND to ${recipientAta.address.toBase58()}`)
  console.log('Refresh your wallet — VEND should appear in Phantom on Devnet.')
}

main().catch(e => { console.error(e); process.exit(1) })
