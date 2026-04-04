/**
 * Передаёт mint authority VEND токена на sale_pool PDA
 * Запуск: npx ts-node --project tsconfig.json scripts/transfer-mint-authority.ts
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createSetAuthorityInstruction, AuthorityType } from "@solana/spl-token";
import { sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import * as fs from "fs";

const VEND_MINT = new PublicKey("CNFeMq6S9BMbsHbWTYBVCkjvQJ95UX5gmrVn95nerDeZ");
const SALE_POOL_PDA = new PublicKey("5pmiERqP8LJedAtNogeQstWBubwBF7CNRKJjrxbezyJ2");

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const raw = JSON.parse(fs.readFileSync("C:/solana/id.json", "utf-8"));
  const authority = Keypair.fromSecretKey(Buffer.from(raw));

  console.log("Current authority:", authority.publicKey.toBase58());
  console.log("New authority (sale_pool PDA):", SALE_POOL_PDA.toBase58());

  const ix = createSetAuthorityInstruction(
    VEND_MINT,
    authority.publicKey,
    AuthorityType.MintTokens,
    SALE_POOL_PDA,
  );

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(conn, tx, [authority]);
  console.log("✅ Mint authority transferred! Signature:", sig);
}

main().catch(console.error);
