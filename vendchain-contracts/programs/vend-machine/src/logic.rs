use anchor_lang::prelude::*;
use crate::errors::MachineError;
use crate::state::SaleEvent;
use crate::{RegisterMachine, RecordSale, ToggleMachine};

pub fn register_machine(
    ctx: Context<RegisterMachine>,
    machine_id: [u8; 16],
    location: [u8; 64],
) -> Result<()> {
    // Validate machine_id — must have at least one non-zero byte
    require!(machine_id.iter().any(|&b| b != 0), MachineError::InvalidMachineId);
    // Validate location — must have at least one non-zero byte
    require!(location.iter().any(|&b| b != 0), MachineError::InvalidLocation);

    let registry = &mut ctx.accounts.registry;
    let machine = &mut ctx.accounts.machine;
    let clock = Clock::get()?;

    machine.owner = ctx.accounts.owner.key();
    machine.machine_id = machine_id;
    machine.location = location;
    machine.total_revenue = 0;
    machine.total_sales = 0;
    machine.is_active = true;
    machine.registered_at = clock.unix_timestamp;
    machine.last_sale_at = 0;
    machine.bump = ctx.bumps.machine;

    registry.total_machines = registry.total_machines
        .checked_add(1)
        .ok_or(MachineError::Overflow)?;

    msg!(
        "Machine registered: {} at slot {}",
        machine.machine_id_str(),
        clock.slot
    );
    Ok(())
}

pub fn record_sale(
    ctx: Context<RecordSale>,
    amount_lamports: u64,
) -> Result<()> {
    require!(amount_lamports > 0, MachineError::ZeroAmount);

    let machine = &mut ctx.accounts.machine;
    require!(machine.is_active, MachineError::MachineNotActive);

    let registry = &mut ctx.accounts.registry;
    let clock = Clock::get()?;

    machine.total_revenue = machine.total_revenue
        .checked_add(amount_lamports)
        .ok_or(MachineError::Overflow)?;
    machine.total_sales = machine.total_sales
        .checked_add(1)
        .ok_or(MachineError::Overflow)?;
    machine.last_sale_at = clock.unix_timestamp;

    registry.total_revenue = registry.total_revenue
        .checked_add(amount_lamports)
        .ok_or(MachineError::Overflow)?;

    emit!(SaleEvent {
        machine_id: machine.machine_id,
        buyer: ctx.accounts.buyer.key(),
        amount_lamports,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Sale recorded: {} lamports on machine {}",
        amount_lamports,
        machine.machine_id_str()
    );
    Ok(())
}

pub fn toggle_machine(ctx: Context<ToggleMachine>, is_active: bool) -> Result<()> {
    let machine = &mut ctx.accounts.machine;
    require!(
        machine.owner == ctx.accounts.owner.key(),
        MachineError::Unauthorized
    );
    machine.is_active = is_active;
    msg!("Machine {} active={}", machine.machine_id_str(), is_active);
    Ok(())
}
