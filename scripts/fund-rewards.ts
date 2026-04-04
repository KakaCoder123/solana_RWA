/**
 * Transfer VEND tokens from deployer wallet into the staking reward_vault_v2
 * so that users can claim staking rewards.
 *
 * Usage: npx tsx scripts/fund-rewards.ts
 */
import {
  Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAccount,
} from "@solana/spl-token";
import * as fs from "fs";

const RPC_URL   = "https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39";
const PROGRAM_ID = new PublicKey("9T4YTDnoA1KQyVmcyEqJug5jWkXEjyi6WLw2uKr9kowK");
const VEND_MINT  = new PublicKey("CNFeMq6S9BMbsHbWTYBVCkjvQJ95UX5gmrVn95nerDeZ");

// How many VEND tokens to deposit into the reward vault (raw units, 6 decimals)
const FUND_AMOUNT = 9_500 * 1_000_000; // 9,500 VEND

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");

  const paths = [
    "C:/Users/Админ/.config/solana/id.json",
    `${process.env.HOME}/.config/solana/id.json`,
    "C:/solana/id.json",
  ];
  let payer: Keypair | null = null;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      payer = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
      console.log("Using keypair:", p);
      break;
    }
  }
  if (!payer) throw new Error("Keypair not found");

  console.log("Payer:", payer.publicKey.toBase58());

  // reward_vault_v2 PDA (authority = staking_pool PDA, but it's a token account seeded directly)
  const [rewardVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("reward_vault_v2")],
    PROGRAM_ID
  );
  console.log("reward_vault_v2:", rewardVault.toBase58());

  // Get payer's VEND token account
  const payerAta = await getOrCreateAssociatedTokenAccount(
    conn, payer, VEND_MINT, payer.publicKey
  );
  console.log("Payer ATA:", payerAta.address.toBase58());
  console.log("Payer VEND balance:", Number(payerAta.amount) / 1e6, "VEND");

  const vaultInfo = await getAccount(conn, rewardVault);
  console.log("Reward vault balance before:", Number(vaultInfo.amount) / 1e6, "VEND");

  console.log(`\nTransferring ${FUND_AMOUNT / 1e6} VEND to reward vault...`);
  const sig = await transfer(
    conn,
    payer,
    payerAta.address,
    rewardVault,
    payer,
    FUND_AMOUNT
  );
  console.log("✅ Funded! Sig:", sig);

  const vaultAfter = await getAccount(conn, rewardVault);
  console.log("Reward vault balance after:", Number(vaultAfter.amount) / 1e6, "VEND");
}

main().catch(console.error);
