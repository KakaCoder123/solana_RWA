use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, MintTo, mint_to, Burn, burn};
use anchor_spl::associated_token::AssociatedToken;
use anchor_lang::system_program;

declare_id!("GodxM9254JxPRsmLvDBxuyhjwdKNhccccJrCj1UFdEdB");

// ─── Errors ──────────────────────────────────────────────────────────────────
#[error_code]
pub enum SaleError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Math overflow")]
    Overflow,
    #[msg("Sale is paused")]
    SalePaused,
    #[msg("Insufficient vault liquidity")]
    InsufficientLiquidity,
}

// ─── State ───────────────────────────────────────────────────────────────────
/// seeds = [b"sale_pool"]
#[account]
pub struct SalePool {
    pub treasury:          Pubkey,
    pub vend_mint:         Pubkey,
    /// lamports per 1 raw-unit (1 VEND = 10^6 raw, цена = price_lamports * 10^6)
    pub price_lamports:    u64,
    pub total_sold:        u64,   // raw units куплено
    pub total_revenue:     u64,   // lamports получено
    pub total_bought_back: u64,   // raw units выкуплено обратно
    pub is_active:         bool,
    pub bump:              u8,
}
impl SalePool {
    // 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1;
}

/// Vault для хранения SOL для buyback — seeds = [b"sale_vault"]
/// Это просто system account (PDA), не хранит данных — только lamports
#[account]
pub struct SaleVault {}
impl SaleVault {
    pub const LEN: usize = 8;
}

/// Событие покупки
#[event]
pub struct TokensBoughtEvent {
    pub buyer:         Pubkey,
    pub amount_tokens: u64,
    pub sol_paid:      u64,
    pub timestamp:     i64,
}

/// Событие продажи
#[event]
pub struct TokensSoldEvent {
    pub seller:        Pubkey,
    pub amount_tokens: u64,
    pub sol_received:  u64,
    pub timestamp:     i64,
}

// ─── Program ─────────────────────────────────────────────────────────────────
#[program]
pub mod vend_sale {
    use super::*;

    /// Инициализировать пул продаж
    pub fn initialize_sale(ctx: Context<InitializeSale>, price_lamports: u64) -> Result<()> {
        let pool = &mut ctx.accounts.sale_pool;
        pool.treasury           = ctx.accounts.treasury.key();
        pool.vend_mint          = ctx.accounts.vend_mint.key();
        pool.price_lamports     = price_lamports;
        pool.total_sold         = 0;
        pool.total_revenue      = 0;
        pool.total_bought_back  = 0;
        pool.is_active          = true;
        pool.bump               = ctx.bumps.sale_pool;
        msg!("Sale initialized. Price: {} lamports/raw-unit", price_lamports);
        Ok(())
    }

    /// Инициализировать vault для buyback ликвидности
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        msg!("Sale vault initialized at {}", ctx.accounts.sale_vault.key());
        Ok(())
    }

    /// Пополнить vault SOL (только authority/admin)
    pub fn fund_vault(ctx: Context<FundVault>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, SaleError::ZeroAmount);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.funder.to_account_info(),
                    to:   ctx.accounts.sale_vault.to_account_info(),
                },
            ),
            amount_lamports,
        )?;
        msg!("Vault funded: {} lamports", amount_lamports);
        Ok(())
    }

    /// Купить VEND за SOL
    pub fn buy_tokens(ctx: Context<BuyTokens>, amount_tokens: u64) -> Result<()> {
        require!(amount_tokens > 0, SaleError::ZeroAmount);
        require!(ctx.accounts.sale_pool.is_active, SaleError::SalePaused);

        let pool = &ctx.accounts.sale_pool;
        let sol_cost = (amount_tokens as u128)
            .checked_mul(pool.price_lamports as u128)
            .ok_or(SaleError::Overflow)? as u64;

        // 50% → treasury, 50% → vault (buyback ликвидность)
        let to_treasury = sol_cost / 2;
        let to_vault    = sol_cost - to_treasury;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to:   ctx.accounts.treasury.to_account_info(),
                },
            ),
            to_treasury,
        )?;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to:   ctx.accounts.sale_vault.to_account_info(),
                },
            ),
            to_vault,
        )?;

        // Mint VEND → buyer ATA
        let seeds: &[&[u8]] = &[b"sale_pool", &[pool.bump]];
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint:      ctx.accounts.vend_mint.to_account_info(),
                    to:        ctx.accounts.buyer_ata.to_account_info(),
                    authority: ctx.accounts.sale_pool.to_account_info(),
                },
                &[seeds],
            ),
            amount_tokens,
        )?;

        let pool = &mut ctx.accounts.sale_pool;
        pool.total_sold    = pool.total_sold.checked_add(amount_tokens).ok_or(SaleError::Overflow)?;
        pool.total_revenue = pool.total_revenue.checked_add(sol_cost).ok_or(SaleError::Overflow)?;

        let clock = Clock::get()?;
        emit!(TokensBoughtEvent {
            buyer: ctx.accounts.buyer.key(),
            amount_tokens,
            sol_paid: sol_cost,
            timestamp: clock.unix_timestamp,
        });
        msg!("Bought {} raw VEND for {} lamports", amount_tokens, sol_cost);
        Ok(())
    }

    /// Продать VEND за SOL (burn VEND, получить SOL из vault)
    pub fn sell_tokens(ctx: Context<SellTokens>, amount_tokens: u64) -> Result<()> {
        require!(amount_tokens > 0, SaleError::ZeroAmount);
        require!(ctx.accounts.sale_pool.is_active, SaleError::SalePaused);

        let pool = &ctx.accounts.sale_pool;
        let sol_payout = (amount_tokens as u128)
            .checked_mul(pool.price_lamports as u128)
            .ok_or(SaleError::Overflow)? as u64;

        // Проверить что в vault достаточно SOL
        let vault_balance = ctx.accounts.sale_vault.get_lamports();
        let rent = Rent::get()?.minimum_balance(SaleVault::LEN);
        let available = vault_balance.saturating_sub(rent);
        require!(available >= sol_payout, SaleError::InsufficientLiquidity);

        // Burn VEND из ATA продавца
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint:      ctx.accounts.vend_mint.to_account_info(),
                    from:      ctx.accounts.seller_ata.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            amount_tokens,
        )?;

        // SOL из vault → seller (прямая манипуляция lamports — system_program::transfer
        // не работает из аккаунтов с данными: NonSystemAccountDataNotEmpty)
        **ctx.accounts.sale_vault.to_account_info().try_borrow_mut_lamports()? -= sol_payout;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_payout;

        let pool = &mut ctx.accounts.sale_pool;
        pool.total_bought_back = pool.total_bought_back
            .checked_add(amount_tokens).ok_or(SaleError::Overflow)?;

        let clock = Clock::get()?;
        emit!(TokensSoldEvent {
            seller: ctx.accounts.seller.key(),
            amount_tokens,
            sol_received: sol_payout,
            timestamp: clock.unix_timestamp,
        });
        msg!("Sold {} raw VEND for {} lamports", amount_tokens, sol_payout);
        Ok(())
    }

    /// Поставить на паузу / возобновить
    pub fn set_active(ctx: Context<SetActive>, is_active: bool) -> Result<()> {
        ctx.accounts.sale_pool.is_active = is_active;
        msg!("Sale is_active={}", is_active);
        Ok(())
    }

    /// [Admin] Закрыть старый sale_pool (для миграции v0.1 → v0.2)
    /// Использует UncheckedAccount чтобы обойти десериализацию старого формата
    pub fn close_sale_pool(ctx: Context<CloseSalePool>) -> Result<()> {
        let pool = ctx.accounts.sale_pool.to_account_info();
        let dest = ctx.accounts.authority.to_account_info();
        let lamports = pool.lamports();
        **pool.try_borrow_mut_lamports()? -= lamports;
        **dest.try_borrow_mut_lamports()? += lamports;
        // Обнулить данные
        let mut data = pool.try_borrow_mut_data()?;
        data.fill(0);
        msg!("sale_pool closed, {} lamports returned", lamports);
        Ok(())
    }
}

// ─── Account contexts ─────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct InitializeSale<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = SalePool::LEN,
        seeds = [b"sale_pool"],
        bump,
    )]
    pub sale_pool: Account<'info, SalePool>,

    pub vend_mint: Account<'info, Mint>,

    /// CHECK: кошелёк для сбора SOL
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = SaleVault::LEN,
        seeds = [b"sale_vault"],
        bump,
    )]
    pub sale_vault: Account<'info, SaleVault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    /// CHECK: SOL vault PDA
    #[account(mut, seeds = [b"sale_vault"], bump)]
    pub sale_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"sale_pool"],
        bump = sale_pool.bump,
        constraint = sale_pool.vend_mint == vend_mint.key(),
    )]
    pub sale_pool: Account<'info, SalePool>,

    #[account(mut)]
    pub vend_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint      = vend_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_ata: Account<'info, TokenAccount>,

    /// CHECK: treasury
    #[account(mut, constraint = treasury.key() == sale_pool.treasury)]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: SOL vault
    #[account(mut, seeds = [b"sale_vault"], bump)]
    pub sale_vault: UncheckedAccount<'info>,

    pub token_program:            Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program:           Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"sale_pool"],
        bump = sale_pool.bump,
        constraint = sale_pool.vend_mint == vend_mint.key(),
    )]
    pub sale_pool: Account<'info, SalePool>,

    #[account(mut)]
    pub vend_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint      = vend_mint,
        associated_token::authority = seller,
    )]
    pub seller_ata: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"sale_vault"], bump)]
    pub sale_vault: Account<'info, SaleVault>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetActive<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"sale_pool"],
        bump = sale_pool.bump,
        constraint = sale_pool.treasury == authority.key() @ SaleError::SalePaused,
    )]
    pub sale_pool: Account<'info, SalePool>,
}

#[derive(Accounts)]
pub struct CloseSalePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: intentionally unchecked to bypass v0.1 deserialization
    #[account(mut, seeds = [b"sale_pool"], bump)]
    pub sale_pool: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
