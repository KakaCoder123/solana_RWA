use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::errors::VendError;
use crate::state::*;
use crate::{
    InitializeStakingPool, Stake, RequestUnstake, Withdraw, ClaimRewards, FundRewards,
};

pub fn initialize_pool(ctx: Context<InitializeStakingPool>, reward_rate_bps: u64) -> Result<()> {
    let pool = &mut ctx.accounts.staking_pool;
    pool.authority = ctx.accounts.authority.key();
    pool.vend_mint = ctx.accounts.vend_mint.key();
    pool.total_staked = 0;
    pool.reward_rate_bps = reward_rate_bps;
    pool.rewards_available = 0;
    pool.last_update_ts = Clock::get()?.unix_timestamp;
    pool.bump = ctx.bumps.staking_pool;
    pool.stake_vault_bump = ctx.bumps.stake_vault;
    pool.reward_vault_bump = ctx.bumps.reward_vault;
    msg!("Staking pool initialized. APY rate: {} bps", reward_rate_bps);
    Ok(())
}

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, VendError::ZeroAmount);
    let clock = Clock::get()?;

    {
        let pool = &ctx.accounts.staking_pool;
        let user = &mut ctx.accounts.user_stake;
        if user.staked_amount > 0 {
            let elapsed = (clock.unix_timestamp - user.last_reward_ts) as u64;
            let accrued = calc_rewards(user.staked_amount, pool.reward_rate_bps, elapsed);
            user.pending_rewards = user.pending_rewards.saturating_add(accrued);
        }
        user.last_reward_ts = clock.unix_timestamp;
        if user.owner == Pubkey::default() {
            user.owner = ctx.accounts.owner.key();
            user.bump = ctx.bumps.user_stake;
        }
    }

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        amount,
    )?;

    ctx.accounts.user_stake.staked_amount = ctx.accounts.user_stake
        .staked_amount
        .checked_add(amount)
        .ok_or(VendError::Overflow)?;

    ctx.accounts.staking_pool.total_staked = ctx.accounts.staking_pool
        .total_staked
        .checked_add(amount)
        .ok_or(VendError::Overflow)?;

    msg!("Staked {} VEND. Pool total: {}", amount, ctx.accounts.staking_pool.total_staked);
    Ok(())
}

pub fn request_unstake(ctx: Context<RequestUnstake>, amount: u64) -> Result<()> {
    require!(amount > 0, VendError::ZeroAmount);
    require!(
        ctx.accounts.user_stake.staked_amount >= amount,
        VendError::InsufficientBalance
    );
    let clock = Clock::get()?;

    {
        let pool = &ctx.accounts.staking_pool;
        let user = &mut ctx.accounts.user_stake;
        let elapsed = (clock.unix_timestamp - user.last_reward_ts) as u64;
        let accrued = calc_rewards(user.staked_amount, pool.reward_rate_bps, elapsed);
        user.pending_rewards = user.pending_rewards.saturating_add(accrued);
        user.last_reward_ts = clock.unix_timestamp;
        user.staked_amount = user.staked_amount.checked_sub(amount).ok_or(VendError::Overflow)?;
    }

    ctx.accounts.staking_pool.total_staked = ctx.accounts.staking_pool
        .total_staked
        .saturating_sub(amount);

    let req = &mut ctx.accounts.unstake_request;
    req.owner = ctx.accounts.owner.key();
    req.amount = amount;
    req.unlock_ts = clock.unix_timestamp + UnstakeRequest::LOCKUP_SECONDS;
    req.bump = ctx.bumps.unstake_request;

    msg!("Unstake requested: {} VEND, unlocks at {}", amount, req.unlock_ts);
    Ok(())
}

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= ctx.accounts.unstake_request.unlock_ts,
        VendError::LockupActive
    );

    let amount = ctx.accounts.unstake_request.amount;
    let bump = ctx.accounts.staking_pool.bump;
    let pool_seeds: &[&[&[u8]]] = &[&[b"staking_pool", &[bump]]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.staking_pool.to_account_info(),
            },
            pool_seeds,
        ),
        amount,
    )?;

    msg!("Withdrawn {} VEND", amount);
    Ok(())
}

pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let clock = Clock::get()?;
    let elapsed = (clock.unix_timestamp - ctx.accounts.user_stake.last_reward_ts) as u64;
    let accrued = calc_rewards(
        ctx.accounts.user_stake.staked_amount,
        ctx.accounts.staking_pool.reward_rate_bps,
        elapsed,
    );
    let total = ctx.accounts.user_stake.pending_rewards.saturating_add(accrued);

    require!(total > 0, VendError::NoRewards);
    require!(ctx.accounts.reward_vault.amount >= total, VendError::InsufficientRewards);

    ctx.accounts.user_stake.pending_rewards = 0;
    ctx.accounts.user_stake.last_reward_ts = clock.unix_timestamp;
    ctx.accounts.staking_pool.rewards_available = ctx.accounts.staking_pool
        .rewards_available
        .saturating_sub(total);

    let bump = ctx.accounts.staking_pool.bump;
    let pool_seeds: &[&[&[u8]]] = &[&[b"staking_pool", &[bump]]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.staking_pool.to_account_info(),
            },
            pool_seeds,
        ),
        total,
    )?;

    msg!("Claimed {} VEND rewards", total);
    Ok(())
}

pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
    require!(amount > 0, VendError::ZeroAmount);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.funder_token_account.to_account_info(),
                to: ctx.accounts.reward_vault.to_account_info(),
                authority: ctx.accounts.funder.to_account_info(),
            },
        ),
        amount,
    )?;

    ctx.accounts.staking_pool.rewards_available = ctx.accounts.staking_pool
        .rewards_available
        .checked_add(amount)
        .ok_or(VendError::Overflow)?;

    msg!("Reward pool funded: {} VEND", amount);
    Ok(())
}

pub fn close_staking_pool(ctx: Context<crate::CloseStakingPool>) -> Result<()> {
    msg!("Staking pool closed by authority: {}", ctx.accounts.authority.key());
    Ok(())
}
