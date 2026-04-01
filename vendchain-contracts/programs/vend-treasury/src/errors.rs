use anchor_lang::prelude::*;

#[error_code]
pub enum TreasuryError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Math overflow")]
    Overflow,
    #[msg("Only authority can perform this action")]
    Unauthorized,
    #[msg("Invalid staking vault account")]
    InvalidStakingVault,
    #[msg("Invalid machine owner account")]
    InvalidMachineOwner,
}
