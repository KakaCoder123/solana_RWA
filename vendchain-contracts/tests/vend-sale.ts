/**
 * Tests for the vend_sale Anchor program on Devnet.
 *
 * Run:
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=C:\solana\id.json \
 *   npx tsx ./node_modules/mocha/bin/mocha.js -t 60000 tests/vend-sale.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../lib/idl/vend_sale.json"), "utf-8")
);

const PROGRAM_ID  = new PublicKey("7EyTzqMn6hkx3FpobpUEWLNEh5TA7et7XDMMvtQancbj");
const VEND_MINT   = new PublicKey("4jPcj3JZp66pCPSTWFM5zZUWBgaFEceuoti8eu9e8Va8");

// 1 lamport per raw-unit → 1 VEND (10^6 raw) = 1_000_000 lamports = 0.001 SOL
const PRICE_LAMPORTS = new BN(1);

function getSalePoolPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("sale_pool")], PROGRAM_ID)[0];
}

describe("vend_sale (devnet)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL, provider) as any;
  const authority = provider.wallet as anchor.Wallet;

  const salePoolPda = getSalePoolPda();

  // ── 1. Initialize ─────────────────────────────────────────────────────────
  it("initialize_sale creates SalePool PDA", async () => {
    const existing = await provider.connection.getAccountInfo(salePoolPda);
    if (existing) {
      console.log("    SalePool already exists — skipping init");
      return;
    }

    await program.methods
      .initializeSale(PRICE_LAMPORTS)
      .accounts({
        authority:     authority.publicKey,
        vendMint:      VEND_MINT,
        treasury:      authority.publicKey, // SOL идёт обратно к authority в тестах
      })
      .rpc();

    const pool = await program.account.salePool.fetch(salePoolPda);
    assert.ok(pool.vendMint.equals(VEND_MINT), "vend_mint set");
    assert.equal(pool.priceLamports.toNumber(), PRICE_LAMPORTS.toNumber(), "price set");
    assert.isTrue(pool.isActive, "sale is active");
    assert.equal(pool.totalSold.toNumber(), 0);
  });

  // ── 2. Buy tokens ─────────────────────────────────────────────────────────
  it("buy_tokens mints VEND to buyer ATA and charges SOL", async () => {
    const pool = await program.account.salePool.fetch(salePoolPda);
    const buyerAta = getAssociatedTokenAddressSync(VEND_MINT, authority.publicKey);

    // Баланс ATA до покупки (0 если не существует)
    let ataBefore = 0;
    try {
      const info = await provider.connection.getTokenAccountBalance(buyerAta);
      ataBefore = Number(info.value.amount);
    } catch { /* ATA не существует */ }

    const AMOUNT = new BN(5_000_000); // 5 VEND (6 decimals)
    const expectedCost = AMOUNT.toNumber() * PRICE_LAMPORTS.toNumber(); // 5_000_000 lamports

    await program.methods
      .buyTokens(AMOUNT)
      .accounts({
        buyer:    authority.publicKey,
        vendMint: VEND_MINT,
        buyerAta: buyerAta,
        treasury: pool.treasury,
      })
      .rpc();

    // Проверить ATA получил токены
    const ataAfter = await provider.connection.getTokenAccountBalance(buyerAta);
    const ataReceived = Number(ataAfter.value.amount) - ataBefore;
    assert.equal(ataReceived, AMOUNT.toNumber(), "buyer received correct VEND amount");

    // Проверить статистику пула
    const poolAfter = await program.account.salePool.fetch(salePoolPda);
    assert.isAtLeast(poolAfter.totalSold.toNumber(), AMOUNT.toNumber(), "totalSold updated");
    assert.isAtLeast(poolAfter.totalRevenue.toNumber(), expectedCost, "totalRevenue updated");
  });

  // ── 3. Cumulative buys ────────────────────────────────────────────────────
  it("second buy_tokens accumulates totalSold", async () => {
    const pool = await program.account.salePool.fetch(salePoolPda);
    const soldBefore = pool.totalSold.toNumber();

    const AMOUNT = new BN(1_000_000); // 1 VEND
    await program.methods
      .buyTokens(AMOUNT)
      .accounts({
        buyer:    authority.publicKey,
        vendMint: VEND_MINT,
        buyerAta: getAssociatedTokenAddressSync(VEND_MINT, authority.publicKey),
        treasury: pool.treasury,
      })
      .rpc();

    const poolAfter = await program.account.salePool.fetch(salePoolPda);
    assert.equal(
      poolAfter.totalSold.toNumber(),
      soldBefore + AMOUNT.toNumber(),
      "totalSold accumulates"
    );
  });

  // ── 4. Zero amount fails ──────────────────────────────────────────────────
  it("buy_tokens rejects zero amount", async () => {
    const pool = await program.account.salePool.fetch(salePoolPda);
    let threw = false;
    try {
      await program.methods
        .buyTokens(new BN(0))
        .accounts({
          buyer:    authority.publicKey,
          vendMint: VEND_MINT,
          buyerAta: getAssociatedTokenAddressSync(VEND_MINT, authority.publicKey),
          treasury: pool.treasury,
        })
        .rpc();
    } catch (err: any) {
      threw = true;
      assert.ok(
        (err.message ?? "").includes("ZeroAmount") || (err.message ?? "").includes("6000"),
        `Expected ZeroAmount, got: ${err.message}`
      );
    }
    assert.isTrue(threw, "Expected error for zero amount");
  });

  // ── 5. set_active pauses the sale ────────────────────────────────────────
  it("set_active pauses sale and buy_tokens fails", async () => {
    await program.methods
      .setActive(false)
      .accounts({ authority: authority.publicKey })
      .rpc();

    const pool = await program.account.salePool.fetch(salePoolPda);
    assert.isFalse(pool.isActive, "sale paused");

    let threw = false;
    try {
      await program.methods
        .buyTokens(new BN(1_000_000))
        .accounts({
          buyer:    authority.publicKey,
          vendMint: VEND_MINT,
          buyerAta: getAssociatedTokenAddressSync(VEND_MINT, authority.publicKey),
          treasury: pool.treasury,
        })
        .rpc();
    } catch { threw = true; }
    assert.isTrue(threw, "Buy should fail when paused");

    // Возобновить
    await program.methods
      .setActive(true)
      .accounts({ authority: authority.publicKey })
      .rpc();
  });
});
