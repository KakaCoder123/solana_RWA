use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
mod logic;

use state::*;
use errors::TreasuryError;

declare_id!("JBVJhEat5c7NEhJJcmnoc32ZrS7P1WHMaa2maQxCDJP8");

/// Solana incinerator — стандартный burn-адрес
pub const BURN_ADDRESS: &str = "1nc1nerator11111111111111111111111111111111";

#[program]
pub mod vend_treasury {
    use super::*;

    /// Инициализировать treasury (один раз)
    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        machine_owner: Pubkey,
        staking_vault: Pubkey,
    ) -> Result<()> {
        logic::initialize_treasury(ctx, machine_owner, staking_vault)
    }

    /// Распределить выручку: 70% owner / 20% staking / 10% burn
    pub fn split_revenue(ctx: Context<SplitRevenue>, amount_lamports: u64) -> Result<()> {
        logic::split_revenue(ctx, amount_lamports)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Account contexts
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = TreasuryVault::LEN,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SplitRevenue<'info> {
    /// Плательщик — тот кто вносит выручку (например IoT/operator)
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    /// 70% получатель — владелец машины
    /// CHECK: адрес проверяется в logic.rs через treasury.machine_owner
    #[account(mut)]
    pub machine_owner: UncheckedAccount<'info>,

    /// 20% получатель — staking vault
    /// CHECK: адрес проверяется в logic.rs через treasury.staking_vault
    #[account(mut)]
    pub staking_vault: UncheckedAccount<'info>,

    /// 10% burn — Solana incinerator address
    /// CHECK: стандартный burn-адрес, проверяется через constraint
    #[account(
        mut,
        constraint = burn_address.key().to_string() == BURN_ADDRESS
            @ TreasuryError::Unauthorized,
    )]
    pub burn_address: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
