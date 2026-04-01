use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
mod logic;

use state::*;
use errors::MachineError;

declare_id!("6P7dyj9tyxw9zZbG6ZmJGVVYwWpWUqpYaXcgcH9MGpFw");

#[program]
pub mod vend_machine {
    use super::*;

    /// Инициализировать глобальный реестр машин (один раз)
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let reg = &mut ctx.accounts.registry;
        reg.authority = ctx.accounts.authority.key();
        reg.total_machines = 0;
        reg.total_revenue = 0;
        reg.bump = ctx.bumps.registry;
        msg!("VendChain machine registry initialized");
        Ok(())
    }

    /// Зарегистрировать новую торговую машину
    pub fn register_machine(
        ctx: Context<RegisterMachine>,
        machine_id: [u8; 16],
        location: [u8; 64],
    ) -> Result<()> {
        logic::register_machine(ctx, machine_id, location)
    }

    /// Записать продажу (вызывается IoT-устройством или оператором)
    pub fn record_sale(ctx: Context<RecordSale>, amount_lamports: u64) -> Result<()> {
        logic::record_sale(ctx, amount_lamports)
    }

    /// Включить/выключить машину
    pub fn toggle_machine(ctx: Context<ToggleMachine>, is_active: bool) -> Result<()> {
        logic::toggle_machine(ctx, is_active)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Account contexts
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = MachineRegistry::LEN,
        seeds = [b"machine_registry"],
        bump,
    )]
    pub registry: Account<'info, MachineRegistry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(machine_id: [u8; 16])]
pub struct RegisterMachine<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"machine_registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, MachineRegistry>,

    #[account(
        init,
        payer = owner,
        space = MachineAccount::LEN,
        seeds = [b"machine", machine_id.as_ref()],
        bump,
    )]
    pub machine: Account<'info, MachineAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordSale<'info> {
    /// Покупатель / IoT-оператор
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"machine_registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, MachineRegistry>,

    #[account(
        mut,
        seeds = [b"machine", machine.machine_id.as_ref()],
        bump = machine.bump,
        constraint = machine.is_active @ MachineError::MachineNotActive,
    )]
    pub machine: Account<'info, MachineAccount>,
}

#[derive(Accounts)]
pub struct ToggleMachine<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"machine", machine.machine_id.as_ref()],
        bump = machine.bump,
        constraint = machine.owner == owner.key() @ MachineError::Unauthorized,
    )]
    pub machine: Account<'info, MachineAccount>,
}
