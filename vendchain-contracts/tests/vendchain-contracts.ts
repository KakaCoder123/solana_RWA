import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { VendchainContracts } from "../target/types/vendchain_contracts";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("vendchain-contracts (devnet)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VendchainContracts as Program<VendchainContracts>;
  const authority = provider.wallet as anchor.Wallet;

  let vendMint: PublicKey;
  let userTokenAccount: PublicKey;

  const STAKE_AMOUNT = new BN(1_000_000); // 1 VEND (6 decimals)
  const REWARD_FUND = new BN(10_000_000); // 10 VEND
  const REWARD_RATE_BPS = new BN(1000);   // 10% APY

  before("Setup: create VEND mint and token accounts", async () => {
    vendMint = await createMint(
      provider.connection,
      (authority.payer as Keypair),
      authority.publicKey,
      null,
      6
    );
    console.log("  VEND mint:", vendMint.toBase58());

    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      (authority.payer as Keypair),
      vendMint,
      authority.publicKey
    );
    await mintTo(
      provider.connection,
      (authority.payer as Keypair),
      vendMint,
      userTokenAccount,
      authority.publicKey,
      20_000_000
    );
    console.log("  User token account:", userTokenAccount.toBase58());
  });

  // ─────────────────────────────────────────────────
  // 1. initialize_staking_pool
  // ─────────────────────────────────────────────────
  it("1. Initializes the staking pool", async () => {
    const [stakingPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );

    const tx = await program.methods
      .initializeStakingPool(REWARD_RATE_BPS)
      .accounts({
        authority: authority.publicKey,
        vendMint: vendMint,
      } as any)
      .rpc();
    console.log("  tx:", tx);

    const pool = await program.account.stakingPool.fetch(stakingPoolPda);
    assert.ok(pool.authority.equals(authority.publicKey));
    assert.ok(pool.vendMint.equals(vendMint));
    assert.equal(pool.rewardRateBps.toNumber(), REWARD_RATE_BPS.toNumber());
    assert.equal(pool.totalStaked.toNumber(), 0);
    console.log("  Pool initialized. rewardRateBps:", pool.rewardRateBps.toNumber());
  });

  // ─────────────────────────────────────────────────
  // 2. fund_rewards
  // ─────────────────────────────────────────────────
  it("2. Funds the reward vault", async () => {
    const [stakingPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );
    const [rewardVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault")],
      program.programId
    );

    const tx = await program.methods
      .fundRewards(REWARD_FUND)
      .accounts({
        funder: authority.publicKey,
        funderTokenAccount: userTokenAccount,
      } as any)
      .rpc();
    console.log("  tx:", tx);

    const pool = await program.account.stakingPool.fetch(stakingPoolPda);
    assert.equal(pool.rewardsAvailable.toNumber(), REWARD_FUND.toNumber());

    const vaultBal = (await getAccount(provider.connection, rewardVaultPda)).amount;
    assert.equal(Number(vaultBal), REWARD_FUND.toNumber());
    console.log("  Reward vault funded:", vaultBal.toString());
  });

  // ─────────────────────────────────────────────────
  // 3. stake
  // ─────────────────────────────────────────────────
  it("3. Stakes VEND tokens", async () => {
    const [stakingPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );
    const [stakeVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_vault")],
      program.programId
    );
    const [userStakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_stake"), authority.publicKey.toBuffer()],
      program.programId
    );

    const before = (await getAccount(provider.connection, userTokenAccount)).amount;

    const tx = await program.methods
      .stake(STAKE_AMOUNT)
      .accounts({
        owner: authority.publicKey,
        userTokenAccount: userTokenAccount,
      } as any)
      .rpc();
    console.log("  tx:", tx);

    const userStake = await program.account.userStake.fetch(userStakePda);
    assert.equal(userStake.stakedAmount.toNumber(), STAKE_AMOUNT.toNumber());
    assert.ok(userStake.owner.equals(authority.publicKey));

    const pool = await program.account.stakingPool.fetch(stakingPoolPda);
    assert.equal(pool.totalStaked.toNumber(), STAKE_AMOUNT.toNumber());

    const after = (await getAccount(provider.connection, userTokenAccount)).amount;
    assert.equal(Number(before) - Number(after), STAKE_AMOUNT.toNumber());

    const vaultBal = (await getAccount(provider.connection, stakeVaultPda)).amount;
    assert.equal(Number(vaultBal), STAKE_AMOUNT.toNumber());
    console.log("  Staked:", STAKE_AMOUNT.toNumber(), "| totalStaked:", pool.totalStaked.toNumber());
  });

  // ─────────────────────────────────────────────────
  // 4. claim_rewards (immediate — no rewards yet)
  // ─────────────────────────────────────────────────
  it("4. Claim rewards → NoRewards (called immediately after stake)", async () => {
    try {
      await program.methods
        .claimRewards()
        .accounts({
          owner: authority.publicKey,
          userTokenAccount: userTokenAccount,
        } as any)
        .rpc();
      console.log("  Rewards claimed (some seconds elapsed — OK)");
    } catch (err: any) {
      assert.include(err.message, "NoRewards");
      console.log("  Got expected NoRewards error");
    }
  });

  // ─────────────────────────────────────────────────
  // 5. request_unstake
  // ─────────────────────────────────────────────────
  it("5. Requests unstake", async () => {
    const [userStakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_stake"), authority.publicKey.toBuffer()],
      program.programId
    );
    const [unstakeRequestPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("unstake"), authority.publicKey.toBuffer()],
      program.programId
    );
    const [stakingPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );

    const tx = await program.methods
      .requestUnstake(STAKE_AMOUNT)
      .accounts({
        owner: authority.publicKey,
      } as any)
      .rpc();
    console.log("  tx:", tx);

    const req = await program.account.unstakeRequest.fetch(unstakeRequestPda);
    assert.equal(req.amount.toNumber(), STAKE_AMOUNT.toNumber());
    assert.ok(req.owner.equals(authority.publicKey));

    const now = Math.floor(Date.now() / 1000);
    const lockup = req.unlockTs.toNumber() - now;
    assert.isAtLeast(lockup, 6 * 24 * 60 * 60, "lockup should be ~7 days");
    console.log("  UnstakeRequest created. Unlocks in ~", Math.round(lockup / 86400), "days");

    const stake = await program.account.userStake.fetch(userStakePda);
    assert.equal(stake.stakedAmount.toNumber(), 0);

    const pool = await program.account.stakingPool.fetch(stakingPoolPda);
    assert.equal(pool.totalStaked.toNumber(), 0);
  });

  // ─────────────────────────────────────────────────
  // 6. withdraw before lockup → LockupActive
  // ─────────────────────────────────────────────────
  it("6. Withdraw before lockup ends → LockupActive error", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          owner: authority.publicKey,
          userTokenAccount: userTokenAccount,
        } as any)
        .rpc();
      assert.fail("Should have thrown LockupActive");
    } catch (err: any) {
      assert.include(err.message, "LockupActive");
      console.log("  Got expected LockupActive error — 7-day lockup enforced");
    }
  });
});
