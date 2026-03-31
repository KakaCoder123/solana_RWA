/**
 * 1. Инициализирует sale_vault PDA (через discriminator вручную)
 * 2. Пополняет его 1 SOL для buyback ликвидности
 */
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import * as crypto from "crypto";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("7EyTzqMn6hkx3FpobpUEWLNEh5TA7et7XDMMvtQancbj");

function disc(s: string): Buffer {
  return crypto.createHash("sha256").update(s).digest().slice(0, 8);
}
function u64le(n: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const kp = JSON.parse(fs.readFileSync("C:/solana/id.json", "utf-8"));
  const payer = Keypair.fromSecretKey(Buffer.from(kp));

  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([Buffer.from("sale_vault")], PROGRAM_ID);
  console.log("sale_vault PDA:", vaultPda.toBase58());

  const existing = await conn.getAccountInfo(vaultPda);

  if (!existing) {
    console.log("Initializing vault...");
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true,  isWritable: true  },
        { pubkey: vaultPda,        isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: disc("global:initialize_vault"),
    });
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(conn, tx, [payer]);
    console.log("✅ Vault initialized:", sig);
  } else {
    console.log("Vault already exists, balance:", existing.lamports / 1e9, "SOL");
  }

  // fund_vault: discriminator + amount_lamports (u64 LE)
  const FUND = 1_000_000_000; // 1 SOL
  console.log("Funding vault with 1 SOL...");
  const fundIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: vaultPda,        isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("global:fund_vault"), u64le(FUND)]),
  });
  const sig2 = await sendAndConfirmTransaction(conn, new Transaction().add(fundIx), [payer]);
  console.log("✅ Funded:", sig2);

  const balance = await conn.getBalance(vaultPda);
  console.log("Vault balance:", balance / 1e9, "SOL");
}

main().catch(console.error);
