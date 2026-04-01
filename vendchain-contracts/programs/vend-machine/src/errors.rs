use anchor_lang::prelude::*;

#[error_code]
pub enum MachineError {
    #[msg("Machine ID must be 1-16 ASCII characters")]
    InvalidMachineId,
    #[msg("Location must be 1-64 bytes")]
    InvalidLocation,
    #[msg("Machine is not active")]
    MachineNotActive,
    #[msg("Sale amount must be greater than zero")]
    ZeroAmount,
    #[msg("Only machine owner can perform this action")]
    Unauthorized,
    #[msg("Math overflow")]
    Overflow,
}
