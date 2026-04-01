use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::errors::TreasuryError;
use crate::state::{TreasuryVault, RevenueEvent};
use crate::{InitializeTreasury, SplitRevenue};

pub fn initialize_treasury(
    ctx: Context<InitializeTreasury>,
    machine_owner: Pubkey,
    staking_vault: Pubkey,
) -> Result<()> {
    let vault = &mut ctx.accounts.treasury;
    vault.authority = ctx.accounts.authority.key();
    vault.machine_owner = machine_owner;
    vault.staking_vault = staking_vault;
    vault.total_collected = 0;
    vault.total_distributed = 0;
    vault.bump = ctx.bumps.treasury;
    msg!("VendChain treasury initialized");
    Ok(())
}

pub fn split_revenue(ctx: Context<SplitRevenue>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, TreasuryError::ZeroAmount);

    // ── Рассчитать доли ──────────────────────────────────────────────────
    let owner_share = amount_lamports
        .checked_mul(TreasuryVault::OWNER_BPS)
        .ok_or(TreasuryError::Overflow)?
        .checked_div(10_000)
        .ok_or(TreasuryError::Overflow)?;

    let staking_share = amount_lamports
        .checked_mul(TreasuryVault::STAKING_BPS)
        .ok_or(TreasuryError::Overflow)?
        .checked_div(10_000)
        .ok_or(TreasuryError::Overflow)?;

    // burn_share = остаток (избегаем ошибок округления)
    let burn_share = amount_lamports
        .checked_sub(owner_share)
        .ok_or(TreasuryError::Overflow)?
        .checked_sub(staking_share)
        .ok_or(TreasuryError::Overflow)?;

    let treasury = &mut ctx.accounts.treasury;

    // ── Проверить адреса получателей ─────────────────────────────────────
    require!(
        ctx.accounts.machine_owner.key() == treasury.machine_owner,
        TreasuryError::InvalidMachineOwner
    );
    require!(
        ctx.accounts.staking_vault.key() == treasury.staking_vault,
        TreasuryError::InvalidStakingVault
    );

    // ── Трансфер: 70% → владелец машины ──────────────────────────────────
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.machine_owner.to_account_info(),
            },
        ),
        owner_share,
    )?;

    // ── Трансфер: 20% → staking vault ────────────────────────────────────
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.staking_vault.to_account_info(),
            },
        ),
        staking_share,
    )?;

    // ── 10% burn: отправляем на null-адрес (incinerator) ──────────────────
    // Solana null-адрес: 1nc1nerator11111111111111111111111111111111
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.burn_address.to_account_info(),
            },
        ),
        burn_share,
    )?;

    // ── Обновить статистику ───────────────────────────────────────────────
    treasury.total_collected = treasury.total_collected
        .checked_add(amount_lamports)
        .ok_or(TreasuryError::Overflow)?;
    treasury.total_distributed = treasury.total_distributed
        .checked_add(amount_lamports)
        .ok_or(TreasuryError::Overflow)?;

    let clock = Clock::get()?;
    emit!(RevenueEvent {
        total_amount: amount_lamports,
        owner_share,
        staking_share,
        burn_share,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Revenue split: total={} owner={} staking={} burn={}",
        amount_lamports,
        owner_share,
        staking_share,
        burn_share
    );

    Ok(())
}
