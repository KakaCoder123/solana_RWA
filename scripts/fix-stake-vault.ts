/**
 * Перекидывает VEND из reward_vault_v3 → stake_vault_v3
 * Запускать ПОСЛЕ деплоя нового контракта с admin_fund_stake_vault
 *
 * Запуск: npx tsx scripts/fix-stake-vault.ts
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, BN, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import IDL from "../lib/idl/vendchain_contracts.json";

const RPC_URL = "https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39";
const PROGRAM_ID = new PublicKey("9T4YTDnoA1KQyVmcyEqJug5jWkXEjyi6WLw2uKr9kowK");

// Сколько VEND перекинуть из reward_vault → stake_vault (покрыть дисбаланс)
const AMOUNT_VEND = 10_000;

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");
  const kp = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync("C:/solana/id.json", "utf-8")))
  );
  console.log("Authority:", kp.publicKey.toBase58());

  const provider = new AnchorProvider(conn, new Wallet(kp), { commitment: "confirmed" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(IDL as any, provider);

  const [poolPda]        = PublicKey.findProgramAddressSync([Buffer.from("staking_pool")], PROGRAM_ID);
  const [stakeVault]     = PublicKey.findProgramAddressSync([Buffer.from("stake_vault_v3")], PROGRAM_ID);
  const [rewardVault]    = PublicKey.findProgramAddressSync([Buffer.from("reward_vault_v3")], PROGRAM_ID);

  console.log("stake_vault_v3 :", stakeVault.toBase58());
  console.log("reward_vault_v3:", rewardVault.toBase58());

  const amount = new BN(AMOUNT_VEND * 1_000_000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sig = await (program.methods as any).adminFundStakeVault(amount).accounts({
    authority:  kp.publicKey,
    stakingPool: poolPda,
    stakeVault,
    rewardVault,
  }).rpc();

  console.log("✅ Done! Sig:", sig);
  console.log(`Moved ${AMOUNT_VEND} VEND from reward_vault → stake_vault`);
}

main().catch(console.error);
