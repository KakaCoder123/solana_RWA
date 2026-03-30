use anchor_lang::prelude::*;

#[error_code]
pub enum VendError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient staked balance")]
    InsufficientBalance,
    #[msg("Lockup period has not ended yet")]
    LockupActive,
    #[msg("No rewards available to claim")]
    NoRewards,
    #[msg("Reward pool has insufficient funds")]
    InsufficientRewards,
    #[msg("Math overflow")]
    Overflow,
    #[msg("Invalid token account owner")]
    InvalidOwner,
    #[msg("Invalid mint")]
    InvalidMint,
}
