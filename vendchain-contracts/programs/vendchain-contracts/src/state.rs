use anchor_lang::prelude::*;

#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub vend_mint: Pubkey,
    pub total_staked: u64,
    pub reward_rate_bps: u64,
    pub rewards_available: u64,
    pub last_update_ts: i64,
    pub bump: u8,
    pub stake_vault_bump: u8,
    pub reward_vault_bump: u8,
}

impl StakingPool {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 1;
    pub const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;
}

#[account]
pub struct UserStake {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub pending_rewards: u64,
    pub last_reward_ts: i64,
    pub bump: u8,
}

impl UserStake {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct UnstakeRequest {
    pub owner: Pubkey,
    pub amount: u64,
    pub unlock_ts: i64,
    pub bump: u8,
}

impl UnstakeRequest {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1;
    pub const LOCKUP_SECONDS: i64 = 0; // нет локапа (devnet-демо)
}

pub fn calc_rewards(staked: u64, rate_bps: u64, elapsed_secs: u64) -> u64 {
    if staked == 0 || elapsed_secs == 0 {
        return 0;
    }
    (staked as u128)
        .saturating_mul(rate_bps as u128)
        .saturating_mul(elapsed_secs as u128)
        .checked_div(10_000u128 * StakingPool::SECONDS_PER_YEAR as u128)
        .unwrap_or(0) as u64
}
