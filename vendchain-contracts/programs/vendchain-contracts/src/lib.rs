use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub mod errors;
pub mod state;

use errors::VendError;
use state::*;

mod logic;

declare_id!("54v59Q2EA84gV8RY83nFyYHbnvZASyxgiT8zgNKA2yYV");

#[program]
pub mod vendchain_contracts {
    use super::*;

    pub fn initialize_staking_pool(
        ctx: Context<InitializeStakingPool>,
        reward_rate_bps: u64,
    ) -> Result<()> {
        logic::initialize_pool(ctx, reward_rate_bps)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        logic::stake(ctx, amount)
    }

    pub fn request_unstake(ctx: Context<RequestUnstake>, amount: u64) -> Result<()> {
        logic::request_unstake(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        logic::withdraw(ctx)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        logic::claim_rewards(ctx)
    }

    pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
        logic::fund_rewards(ctx, amount)
    }

    pub fn close_staking_pool(ctx: Context<CloseStakingPool>) -> Result<()> {
        logic::close_staking_pool(ctx)
    }
}

// ─────────────────────────────────────────────────────────────────
// Account contexts — все #[derive(Accounts)] должны быть здесь
// ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeStakingPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub vend_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = StakingPool::LEN,
        seeds = [b"staking_pool"],
        bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init,
        payer = authority,
        token::mint = vend_mint,
        token::authority = staking_pool,
        seeds = [b"stake_vault"],
        bump,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = vend_mint,
        token::authority = staking_pool,
        seeds = [b"reward_vault"],
        bump,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = owner,
        space = UserStake::LEN,
        seeds = [b"user_stake", owner.key().as_ref()],
        bump,
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(
        mut,
        seeds = [b"stake_vault"],
        bump = staking_pool.stake_vault_bump,
        token::mint = staking_pool.vend_mint,
        token::authority = staking_pool,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ VendError::InvalidOwner,
        constraint = user_token_account.mint == staking_pool.vend_mint @ VendError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"user_stake", owner.key().as_ref()],
        bump = user_stake.bump,
        constraint = user_stake.owner == owner.key() @ VendError::InvalidOwner,
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(
        init,
        payer = owner,
        space = UnstakeRequest::LEN,
        seeds = [b"unstake", owner.key().as_ref()],
        bump,
    )]
    pub unstake_request: Account<'info, UnstakeRequest>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        close = owner,
        seeds = [b"unstake", owner.key().as_ref()],
        bump = unstake_request.bump,
        constraint = unstake_request.owner == owner.key() @ VendError::InvalidOwner,
    )]
    pub unstake_request: Account<'info, UnstakeRequest>,

    #[account(
        mut,
        seeds = [b"stake_vault"],
        bump = staking_pool.stake_vault_bump,
        token::mint = staking_pool.vend_mint,
        token::authority = staking_pool,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ VendError::InvalidOwner,
        constraint = user_token_account.mint == staking_pool.vend_mint @ VendError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"user_stake", owner.key().as_ref()],
        bump = user_stake.bump,
        constraint = user_stake.owner == owner.key() @ VendError::InvalidOwner,
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(
        mut,
        seeds = [b"reward_vault"],
        bump = staking_pool.reward_vault_bump,
        token::mint = staking_pool.vend_mint,
        token::authority = staking_pool,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ VendError::InvalidOwner,
        constraint = user_token_account.mint == staking_pool.vend_mint @ VendError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FundRewards<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"reward_vault"],
        bump = staking_pool.reward_vault_bump,
        token::mint = staking_pool.vend_mint,
        token::authority = staking_pool,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = funder_token_account.owner == funder.key() @ VendError::InvalidOwner,
        constraint = funder_token_account.mint == staking_pool.vend_mint @ VendError::InvalidMint,
    )]
    pub funder_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseStakingPool<'info> {
    #[account(
        mut,
        constraint = authority.key() == staking_pool.authority @ VendError::InvalidOwner,
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        close = authority,
        seeds = [b"staking_pool"],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,
}
