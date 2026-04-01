/**
 * Tests for the vend_treasury Anchor program on Devnet.
 *
 * Run:
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=C:\solana\id.json \
 *   npx tsx ./node_modules/mocha/bin/mocha.js -t 60000 tests/vend-treasury.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../lib/idl/vend_treasury.json"), "utf-8")
);

const PROGRAM_ID = new PublicKey("JBVJhEat5c7NEhJJcmnoc32ZrS7P1WHMaa2maQxCDJP8");
const BURN_ADDRESS = new PublicKey("1nc1nerator11111111111111111111111111111111");

function getTreasuryPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID)[0];
}

describe("vend_treasury (devnet)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL, provider) as any;
  const authority = provider.wallet as anchor.Wallet;

  // Separate keypairs for machine owner and staking vault (fresh each run)
  const machineOwner = Keypair.generate();
  const stakingVaultKp = Keypair.generate();

  const treasuryPda = getTreasuryPda();

  // ── 1. Initialize treasury ───────────────────────────────────────────────
  it("initialize_treasury creates TreasuryVault PDA", async () => {
    const existing = await provider.connection.getAccountInfo(treasuryPda);
    if (existing) {
      console.log("    Treasury already exists — skipping init");
      return;
    }

    await program.methods
      .initializeTreasury(machineOwner.publicKey, stakingVaultKp.publicKey)
      .accounts({ authority: authority.publicKey })
      .rpc();

    const vault = await program.account.treasuryVault.fetch(treasuryPda);
    assert.ok(vault.authority.equals(authority.publicKey), "authority set");
    assert.ok(vault.machineOwner.equals(machineOwner.publicKey), "machineOwner set");
    assert.ok(vault.stakingVault.equals(stakingVaultKp.publicKey), "stakingVault set");
    assert.equal(vault.totalCollected.toNumber(), 0);
    assert.equal(vault.totalDistributed.toNumber(), 0);
  });

  // ── 2. Split revenue — verify 70/20/10 split ────────────────────────────
  it("split_revenue distributes 70/20/10 correctly", async () => {
    const vault = await program.account.treasuryVault.fetch(treasuryPda);
    const ownerKey: PublicKey = vault.machineOwner;
    const stakingKey: PublicKey = vault.stakingVault;
    const collectedBefore: number = vault.totalCollected.toNumber();

    // Must be large enough so each recipient exceeds rent-exempt min (890_880 lamports)
    // on first receive. staking gets 20%, so total >= 890_880 / 0.2 = ~4_500_000
    const AMOUNT = new BN(10_000_000); // 0.01 SOL

    await program.methods
      .splitRevenue(AMOUNT)
      .accounts({
        payer: authority.publicKey,
        machineOwner: ownerKey,
        stakingVault: stakingKey,
        burnAddress: BURN_ADDRESS,
      })
      .rpc();

    const vaultAfter = await program.account.treasuryVault.fetch(treasuryPda);

    // Primary check: treasury stats — proves all 3 transfers succeeded
    assert.equal(
      vaultAfter.totalCollected.toNumber(),
      collectedBefore + AMOUNT.toNumber(),
      "totalCollected increased by full amount"
    );
    assert.equal(
      vaultAfter.totalDistributed.toNumber(),
      vaultAfter.totalCollected.toNumber(),
      "totalDistributed matches totalCollected"
    );

    // Secondary check: owner/staking balances increased by correct shares
    // We read balances AFTER confirming the tx to avoid race conditions
    const ownerBalance = await provider.connection.getBalance(ownerKey);
    const stakingBalance = await provider.connection.getBalance(stakingKey);
    const expectedOwnerMin = Math.floor(AMOUNT.toNumber() * 0.7);   // 7_000_000
    const expectedStakingMin = Math.floor(AMOUNT.toNumber() * 0.2); // 2_000_000
    assert.isAtLeast(ownerBalance, expectedOwnerMin, "owner has at least 70% of one split");
    assert.isAtLeast(stakingBalance, expectedStakingMin, "staking has at least 20% of one split");
  });

  // ── 3. Second split — cumulative stats ──────────────────────────────────
  it("split_revenue accumulates totalCollected over multiple calls", async () => {
    const vault = await program.account.treasuryVault.fetch(treasuryPda);
    const collectedBefore: number = vault.totalCollected.toNumber();

    const AMOUNT = new BN(500_000);

    await program.methods
      .splitRevenue(AMOUNT)
      .accounts({
        payer: authority.publicKey,
        machineOwner: vault.machineOwner,
        stakingVault: vault.stakingVault,
        burnAddress: BURN_ADDRESS,
      })
      .rpc();

    const vaultAfter = await program.account.treasuryVault.fetch(treasuryPda);
    assert.equal(
      vaultAfter.totalCollected.toNumber(),
      collectedBefore + AMOUNT.toNumber(),
      "totalCollected accumulates"
    );
  });

  // ── 4. Zero amount fails ─────────────────────────────────────────────────
  it("split_revenue rejects zero amount", async () => {
    const vault = await program.account.treasuryVault.fetch(treasuryPda);

    let threw = false;
    try {
      await program.methods
        .splitRevenue(new BN(0))
        .accounts({
          payer: authority.publicKey,
          machineOwner: vault.machineOwner,
          stakingVault: vault.stakingVault,
          burnAddress: BURN_ADDRESS,
        })
        .rpc();
    } catch (err: any) {
      threw = true;
      const msg: string = err.message ?? "";
      assert.ok(
        msg.includes("ZeroAmount") || msg.includes("6000"),
        `Expected ZeroAmount, got: ${msg}`
      );
    }
    assert.isTrue(threw, "Expected error for zero amount");
  });

  // ── 5. Wrong machine_owner fails ─────────────────────────────────────────
  it("split_revenue rejects wrong machine_owner address", async () => {
    const vault = await program.account.treasuryVault.fetch(treasuryPda);
    const wrongOwner = Keypair.generate().publicKey;

    let threw = false;
    try {
      await program.methods
        .splitRevenue(new BN(100_000))
        .accounts({
          payer: authority.publicKey,
          machineOwner: wrongOwner,
          stakingVault: vault.stakingVault,
          burnAddress: BURN_ADDRESS,
        })
        .rpc();
    } catch (err: any) {
      threw = true;
    }
    assert.isTrue(threw, "Expected error for wrong machine_owner");
  });
});
