/**
 * Закрывает sale_pool и переинициализирует с правильной ценой
 * 0.001 SOL/VEND → price_lamports = 1 (1 lamport per raw unit)
 *
 * Запуск: npx tsx scripts/reset-pool-price.ts
 */
import {
  Connection, Keypair, PublicKey, Transaction,
  TransactionInstruction, SystemProgram, sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as crypto from 'crypto';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('GodxM9254JxPRsmLvDBxuyhjwdKNhccccJrCj1UFdEdB');
const VEND_MINT   = new PublicKey('4nr5wxpSUUZKpePSu8S5MDSRPd5EZ4Lm67S97EGrLY4B');
// 0.001 SOL per VEND: 1 VEND = 10^6 raw, cost = 1 * 10^6 = 10^6 lamports = 0.001 SOL
const NEW_PRICE_LAMPORTS = 1n;

function disc(s: string) { return crypto.createHash('sha256').update(s).digest().subarray(0, 8); }
function u64le(n: bigint) { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b; }

async function main() {
  const RPC = 'https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39';
  const conn = new Connection(RPC, 'confirmed');
  const kp = JSON.parse(fs.readFileSync('C:/solana/id.json', 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(kp));

  const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from('sale_pool')], PROGRAM_ID);
  console.log('pool PDA:', poolPda.toBase58());

  // ── 1. Close sale_pool ──────────────────────────────────────────────────────
  const existing = await conn.getAccountInfo(poolPda);
  if (existing) {
    console.log('Closing sale_pool...');
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true,  isWritable: true  },
        { pubkey: poolPda,         isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: disc('global:close_sale_pool'),
    });
    const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
    console.log('✅ Closed:', sig);
    await new Promise(r => setTimeout(r, 1500));
  } else {
    console.log('sale_pool not found, skipping close');
  }

  // ── 2. Re-initialize with new price ────────────────────────────────────────
  console.log(`Initializing sale_pool with price_lamports=${NEW_PRICE_LAMPORTS}...`);
  const initIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey,         isSigner: true,  isWritable: true  },
      { pubkey: poolPda,                 isSigner: false, isWritable: true  },
      { pubkey: VEND_MINT,               isSigner: false, isWritable: false },
      { pubkey: payer.publicKey,         isSigner: false, isWritable: false }, // treasury
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc('global:initialize_sale'), u64le(NEW_PRICE_LAMPORTS)]),
  });
  const sig2 = await sendAndConfirmTransaction(conn, new Transaction().add(initIx), [payer]);
  console.log('✅ Initialized:', sig2);

  // ── Verify ──────────────────────────────────────────────────────────────────
  const acc = await conn.getAccountInfo(poolPda);
  if (acc) {
    const price = acc.data.readBigUInt64LE(72);
    const pricePerVend = Number(price) * 1e6 / 1e9;
    console.log(`\nPrice on-chain: ${price} lamports/raw = ${pricePerVend} SOL/VEND`);
  }
}

main().catch(console.error);
