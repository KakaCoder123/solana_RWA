/**
 * Полный сброс и настройка vend-sale на devnet:
 * 1. Создать новый VEND mint
 * 2. Инициализировать sale_pool
 * 3. Инициализировать sale_vault
 * 4. Передать mint authority → sale_pool PDA
 * 5. Пополнить vault 1 SOL
 *
 * Запуск: npx tsx scripts/fresh-setup.ts
 */
import {
  Connection, Keypair, PublicKey, Transaction,
  TransactionInstruction, SystemProgram, sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint, createSetAuthorityInstruction,
  AuthorityType, getMint,
} from "@solana/spl-token";
import * as crypto from "crypto";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("GodxM9254JxPRsmLvDBxuyhjwdKNhccccJrCj1UFdEdB");
// 0.001 SOL per 1 raw unit → 1 VEND (10^6 raw) = 1000 SOL
// На devnet ставим символическую цену: 1000 lamports / raw unit → 1 VEND = 0.001 SOL
const PRICE_LAMPORTS = 1000n;

function disc(s: string): Buffer {
  return crypto.createHash("sha256").update(s).digest().subarray(0, 8);
}
function u64le(n: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(n);
  return buf;
}

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const raw = JSON.parse(fs.readFileSync("C:/solana/id.json", "utf-8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(raw));
  console.log("Payer:", payer.publicKey.toBase58());

  const balance = await conn.getBalance(payer.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // ── 1. Derive PDAs ──────────────────────────────────────────────────────────
  const [poolPda, poolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("sale_pool")], PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("sale_vault")], PROGRAM_ID
  );
  console.log("sale_pool PDA:", poolPda.toBase58());
  console.log("sale_vault PDA:", vaultPda.toBase58());
  console.log("poolBump:", poolBump, "\n");

  // ── 2. Create VEND mint (6 decimals) ────────────────────────────────────────
  let vendMint: PublicKey;
  const mintSavePath = "scripts/.vend-mint.json";

  if (fs.existsSync(mintSavePath)) {
    const saved = JSON.parse(fs.readFileSync(mintSavePath, "utf-8"));
    vendMint = new PublicKey(saved.mint);
    console.log("Existing mint found:", vendMint.toBase58());
    // Check if authority is still payer (not yet transferred)
    const mintInfo = await getMint(conn, vendMint);
    if (mintInfo.mintAuthority?.toBase58() === payer.publicKey.toBase58()) {
      console.log("Mint authority: payer (ready to transfer)\n");
    } else if (mintInfo.mintAuthority?.toBase58() === poolPda.toBase58()) {
      console.log("Mint authority: sale_pool PDA (already transferred)\n");
    } else {
      console.log("Mint authority:", mintInfo.mintAuthority?.toBase58(), "(unexpected)\n");
    }
  } else {
    console.log("Creating new VEND mint...");
    vendMint = await createMint(
      conn,
      payer,
      payer.publicKey, // initial mint authority = payer
      null,            // no freeze authority
      6,               // 6 decimals
    );
    fs.writeFileSync(mintSavePath, JSON.stringify({ mint: vendMint.toBase58() }));
    console.log("✅ VEND mint created:", vendMint.toBase58(), "\n");
  }

  // ── 3. Initialize sale_pool ─────────────────────────────────────────────────
  const existingPool = await conn.getAccountInfo(poolPda);
  if (!existingPool) {
    console.log("Initializing sale_pool...");
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey,       isSigner: true,  isWritable: true  },
        { pubkey: poolPda,               isSigner: false, isWritable: true  },
        { pubkey: vendMint,              isSigner: false, isWritable: false },
        { pubkey: payer.publicKey,       isSigner: false, isWritable: false }, // treasury = payer
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([disc("global:initialize_sale"), u64le(PRICE_LAMPORTS)]),
    });
    const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
    console.log("✅ sale_pool initialized:", sig, "\n");
  } else {
    console.log("sale_pool already exists:", existingPool.data.length, "bytes\n");
  }

  // ── 4. Initialize sale_vault ─────────────────────────────────────────────────
  const existingVault = await conn.getAccountInfo(vaultPda);
  if (!existingVault) {
    console.log("Initializing sale_vault...");
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey,         isSigner: true,  isWritable: true  },
        { pubkey: vaultPda,                isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: disc("global:initialize_vault"),
    });
    const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
    console.log("✅ sale_vault initialized:", sig, "\n");
  } else {
    console.log("sale_vault already exists:", existingVault.lamports / 1e9, "SOL\n");
  }

  // ── 5. Transfer mint authority → sale_pool PDA ──────────────────────────────
  const mintInfo = await getMint(conn, vendMint);
  if (mintInfo.mintAuthority?.toBase58() === payer.publicKey.toBase58()) {
    console.log("Transferring mint authority to sale_pool PDA...");
    const ix = createSetAuthorityInstruction(
      vendMint,
      payer.publicKey,
      AuthorityType.MintTokens,
      poolPda,
    );
    const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
    console.log("✅ Mint authority transferred:", sig, "\n");
  } else {
    console.log("Mint authority already at:", mintInfo.mintAuthority?.toBase58(), "\n");
  }

  // ── 6. Fund vault with 1 SOL ─────────────────────────────────────────────────
  const vaultBalance = await conn.getBalance(vaultPda);
  const FUND_AMOUNT = 1_000_000_000n;
  if (BigInt(vaultBalance) < FUND_AMOUNT) {
    console.log("Funding vault with 1 SOL...");
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey,         isSigner: true,  isWritable: true  },
        { pubkey: vaultPda,                isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([disc("global:fund_vault"), u64le(FUND_AMOUNT)]),
    });
    const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
    console.log("✅ Vault funded:", sig, "\n");
  } else {
    console.log("Vault already funded:", vaultBalance / 1e9, "SOL\n");
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const finalVault = await conn.getBalance(vaultPda);
  console.log("═══════════════════════════════════════");
  console.log("PROGRAM_ID  :", PROGRAM_ID.toBase58());
  console.log("VEND_MINT   :", vendMint.toBase58());
  console.log("SALE_POOL   :", poolPda.toBase58());
  console.log("SALE_VAULT  :", vaultPda.toBase58(), "(", finalVault / 1e9, "SOL )");
  console.log("PRICE       :", PRICE_LAMPORTS.toString(), "lamports / raw unit");
  console.log("  → 1 VEND (10^6 raw) =", Number(PRICE_LAMPORTS) * 1e6 / 1e9, "SOL");
  console.log("═══════════════════════════════════════");
  console.log("\n⚠️  Update lib/anchor.ts with:");
  console.log(`  SALE_PROGRAM_ID = "${PROGRAM_ID.toBase58()}"`);
  console.log(`  VEND_MINT       = "${vendMint.toBase58()}"`);
}

main().catch(console.error);
