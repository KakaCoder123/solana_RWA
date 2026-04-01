/**
 * 1. Закрывает старый staking pool (с минтом 4jPc...)
 * 2. Создаёт новый pool с правильным минтом 4nr5... (sale VEND)
 *
 * Запуск ПОСЛЕ деплоя новой программы:
 *   npx tsx scripts/reinit-staking-pool.ts
 */
import {
  Connection, Keypair, PublicKey, Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import IDL from "../lib/idl/vendchain_contracts.json";

const RPC_URL  = "https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39";
const VEND_MINT = new PublicKey("4nr5wxpSUUZKpePSu8S5MDSRPd5EZ4Lm67S97EGrLY4B"); // sale mint
const REWARD_RATE_BPS = 1000; // 10% APY

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");

  // Load deployer keypair
  const paths = ["C:/solana/id.json", `${process.env.HOME}/.config/solana/id.json`];
  let payer: Keypair | null = null;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      payer = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
      console.log("Deployer:", payer.publicKey.toBase58());
      break;
    }
  }
  if (!payer) throw new Error("Keypair not found");

  const balance = await conn.getBalance(payer.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(conn, wallet, { commitment: "confirmed" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(IDL as any, provider);

  const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from("staking_pool")], program.programId);

  // ── Step 1: Close old pool ────────────────────────────────────────
  const existing = await conn.getAccountInfo(poolPda);
  if (existing) {
    console.log("Step 1: Closing old staking pool...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (program.methods as any).closeStakingPool()
      .accounts({ authority: payer.publicKey })
      .transaction();
    const sig = await sendAndConfirmTransaction(conn, tx, [payer]);
    console.log("✅ Old pool closed:", sig);
  } else {
    console.log("Step 1: No existing pool found, skipping close.");
  }

  // ── Step 2: Initialize new pool with correct mint ─────────────────
  console.log("\nStep 2: Initializing new staking pool with VEND mint:", VEND_MINT.toBase58());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx2 = await (program.methods as any).initializeStakingPool(new BN(REWARD_RATE_BPS))
    .accounts({
      authority: payer.publicKey,
      vendMint: VEND_MINT,
    })
    .transaction();
  const sig2 = await sendAndConfirmTransaction(conn, tx2, [payer]);
  console.log("✅ New pool initialized:", sig2);
  console.log("\nDone! Staking now uses VEND mint:", VEND_MINT.toBase58());
}

main().catch(console.error);
