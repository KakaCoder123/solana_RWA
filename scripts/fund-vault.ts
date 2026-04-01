/**
 * Пополнить sale_vault SOL для buyback ликвидности
 * Запуск: npx tsx scripts/fund-vault.ts
 */
import {
  Connection, Keypair, PublicKey, Transaction,
  TransactionInstruction, SystemProgram, sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as crypto from "crypto";
import * as fs from "fs";

const RPC_URL    = "https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39";
const PROGRAM_ID = new PublicKey("GodxM9254JxPRsmLvDBxuyhjwdKNhccccJrCj1UFdEdB");
const FUND_SOL   = 5; // сколько SOL залить

function disc(name: string): Buffer {
  return crypto.createHash("sha256").update(name).digest().slice(0, 8);
}
function u64le(n: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");

  // Попробовать стандартные пути к keypair
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
  if (!payer) {
    console.error("Keypair not found! Укажи путь вручную в скрипте.");
    process.exit(1);
  }

  const balance = await conn.getBalance(payer.publicKey);
  console.log("Payer:", payer.publicKey.toBase58());
  console.log("Payer balance:", balance / 1e9, "SOL");

  const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("sale_vault")], PROGRAM_ID);
  const vaultBalance = await conn.getBalance(vaultPda);
  console.log("Vault PDA:", vaultPda.toBase58());
  console.log("Vault balance before:", vaultBalance / 1e9, "SOL");

  const fundLamports = FUND_SOL * 1_000_000_000;
  console.log(`\nFunding vault with ${FUND_SOL} SOL...`);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: vaultPda,        isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("global:fund_vault"), u64le(fundLamports)]),
  });

  const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
  console.log("✅ Funded! Sig:", sig);

  const newBalance = await conn.getBalance(vaultPda);
  console.log("Vault balance after:", newBalance / 1e9, "SOL");
}

main().catch(console.error);
