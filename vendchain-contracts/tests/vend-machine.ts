/**
 * Tests for the vend_machine Anchor program on Devnet.
 *
 * Run:
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
 *   ANCHOR_WALLET=C:\solana\id.json \
 *   npx ts-mocha -p ./tsconfig.json -t 60000 tests/vend-machine.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";

// Load IDL from the file we generated
const idlPath = path.join(__dirname, "../../lib/idl/vend_machine.json");
const IDL = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

const PROGRAM_ID = new PublicKey("6P7dyj9tyxw9zZbG6ZmJGVVYwWpWUqpYaXcgcH9MGpFw");

function machineIdBytes(ascii: string): number[] {
  const buf = Buffer.alloc(16, 0);
  Buffer.from(ascii).copy(buf);
  return Array.from(buf);
}

function locationBytes(ascii: string): number[] {
  const buf = Buffer.alloc(64, 0);
  Buffer.from(ascii).copy(buf);
  return Array.from(buf);
}

function getRegistryPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("machine_registry")], PROGRAM_ID)[0];
}

function getMachinePda(machineIdArr: number[]): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("machine"), Buffer.from(machineIdArr)],
    PROGRAM_ID
  )[0];
}

describe("vend_machine (devnet)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use `as any` since we have no generated types
  const program = new Program(IDL, provider) as any;
  const authority = provider.wallet as anchor.Wallet;

  const MACHINE_ID = machineIdBytes("VM-TEST-001");
  const LOCATION = locationBytes("Moscow, Arbat 10");
  const machinePda = getMachinePda(MACHINE_ID);
  const registryPda = getRegistryPda();

  // ── 1. Initialize global registry ────────────────────────────────────────
  it("initialize_registry (or skip if already exists)", async () => {
    const existing = await provider.connection.getAccountInfo(registryPda);
    if (existing) {
      console.log("    Registry already exists — skipping init");
      return;
    }

    await program.methods
      .initializeRegistry()
      .accounts({ authority: authority.publicKey })
      .rpc();

    const reg = await program.account.machineRegistry.fetch(registryPda);
    assert.ok(reg.authority.equals(authority.publicKey), "authority set");
    assert.equal(reg.totalMachines.toNumber(), 0, "totalMachines = 0");
  });

  // ── 2. Register a machine ─────────────────────────────────────────────────
  it("register_machine creates a MachineAccount PDA", async () => {
    const existing = await provider.connection.getAccountInfo(machinePda);
    if (existing) {
      console.log("    Machine already registered — skipping");
      return;
    }

    await program.methods
      .registerMachine(MACHINE_ID, LOCATION)
      .accounts({ owner: authority.publicKey })
      .rpc();

    const machine = await program.account.machineAccount.fetch(machinePda);
    assert.ok(machine.owner.equals(authority.publicKey), "owner set");
    assert.isTrue(machine.isActive, "machine is active");
    assert.equal(machine.totalRevenue.toNumber(), 0, "revenue starts at 0");
    assert.equal(machine.totalSales.toNumber(), 0, "sales start at 0");

    // machine_id bytes should match
    assert.deepEqual(Array.from(machine.machineId), MACHINE_ID, "machine_id stored");
  });

  // ── 3. Registry counter increments ────────────────────────────────────────
  it("registry.total_machines increments after registration", async () => {
    const reg = await program.account.machineRegistry.fetch(registryPda);
    assert.isAbove(reg.totalMachines.toNumber(), 0, "at least 1 machine registered");
  });

  // ── 4. Record a sale ──────────────────────────────────────────────────────
  it("record_sale increments machine revenue and registry total", async () => {
    const machineBefore = await program.account.machineAccount.fetch(machinePda);
    const regBefore = await program.account.machineRegistry.fetch(registryPda);

    const SALE = new BN(100_000_000); // 0.1 SOL worth in lamports

    await program.methods
      .recordSale(SALE)
      .accounts({
        buyer: authority.publicKey,
        machine: machinePda,
      })
      .rpc();

    const machineAfter = await program.account.machineAccount.fetch(machinePda);
    const regAfter = await program.account.machineRegistry.fetch(registryPda);

    assert.equal(
      machineAfter.totalRevenue.toNumber(),
      machineBefore.totalRevenue.toNumber() + SALE.toNumber(),
      "machine revenue increased"
    );
    assert.equal(
      machineAfter.totalSales.toNumber(),
      machineBefore.totalSales.toNumber() + 1,
      "machine sales count increased"
    );
    assert.equal(
      regAfter.totalRevenue.toNumber(),
      regBefore.totalRevenue.toNumber() + SALE.toNumber(),
      "registry revenue increased"
    );
  });

  // ── 5. Toggle machine off ─────────────────────────────────────────────────
  it("toggle_machine sets is_active = false", async () => {
    await program.methods
      .toggleMachine(false)
      .accounts({
        owner: authority.publicKey,
        machine: machinePda,
      })
      .rpc();

    const machine = await program.account.machineAccount.fetch(machinePda);
    assert.isFalse(machine.isActive, "machine deactivated");
  });

  // ── 6. record_sale fails when machine is inactive ─────────────────────────
  it("record_sale fails with MachineNotActive when machine is off", async () => {
    let threw = false;
    try {
      await program.methods
        .recordSale(new BN(1_000))
        .accounts({
          buyer: authority.publicKey,
          machine: machinePda,
        })
        .rpc();
    } catch (err: any) {
      threw = true;
      const msg: string = err.message ?? "";
      assert.ok(
        msg.includes("MachineNotActive") || msg.includes("6002") || msg.includes("not active"),
        `Expected MachineNotActive error, got: ${msg}`
      );
    }
    assert.isTrue(threw, "Expected an error but none was thrown");
  });

  // ── 7. Toggle machine back on ─────────────────────────────────────────────
  it("toggle_machine re-enables machine and sale succeeds", async () => {
    await program.methods
      .toggleMachine(true)
      .accounts({
        owner: authority.publicKey,
        machine: machinePda,
      })
      .rpc();

    const machineBefore = await program.account.machineAccount.fetch(machinePda);
    assert.isTrue(machineBefore.isActive, "machine re-enabled");

    await program.methods
      .recordSale(new BN(50_000))
      .accounts({
        buyer: authority.publicKey,
        machine: machinePda,
      })
      .rpc();

    const machineAfter = await program.account.machineAccount.fetch(machinePda);
    assert.equal(
      machineAfter.totalSales.toNumber(),
      machineBefore.totalSales.toNumber() + 1,
      "sale recorded after re-enable"
    );
  });
});
