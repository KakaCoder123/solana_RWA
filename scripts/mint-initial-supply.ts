/**
 * Mint initial VEND supply to deployer wallet.
 * Run BEFORE transfer-mint-authority.ts
 *
 * Usage: npx tsx scripts/mint-initial-supply.ts
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import * as fs from 'fs'

const RPC = 'https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39'
const VEND_MINT = new PublicKey('CNFeMq6S9BMbsHbWTYBVCkjvQJ95UX5gmrVn95nerDeZ')
// Total initial supply: 1,000,000 VEND
const TOTAL_SUPPLY = 1_000_000 * 1_000_000 // raw units (6 decimals)

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const kp = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync('C:/solana/id.json', 'utf-8')))
  )
  console.log('Mint authority (deployer):', kp.publicKey.toBase58())

  // Create/get deployer's ATA for new VEND
  const deployerAta = await getOrCreateAssociatedTokenAccount(
    conn, kp, VEND_MINT, kp.publicKey
  )
  console.log('Deployer ATA:', deployerAta.address.toBase58())

  // Mint tokens
  const sig = await mintTo(conn, kp, VEND_MINT, deployerAta.address, kp, TOTAL_SUPPLY)
  console.log('✅ Minted', TOTAL_SUPPLY / 1_000_000, 'VEND to deployer. Sig:', sig)
  console.log('\nNext steps:')
  console.log('1. npx tsx scripts/reinit-staking-pool.ts')
  console.log('2. npx tsx scripts/fund-rewards.ts')
  console.log('3. npx tsx scripts/reset-pool-price.ts')
  console.log('4. npx tsx scripts/transfer-mint-authority.ts')
}

main().catch(console.error)
