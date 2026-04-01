use anchor_lang::prelude::*;

/// Global treasury vault — один PDA на всю программу
/// seeds = [b"treasury"]
#[account]
pub struct TreasuryVault {
    pub authority: Pubkey,
    /// Кошелёк для получения доли владельца машины (70%)
    pub machine_owner: Pubkey,
    /// Кошелёк staking pool vault для получения наград (20%)
    pub staking_vault: Pubkey,
    /// Общий объём собранных lamports
    pub total_collected: u64,
    /// Общий объём распределённых lamports
    pub total_distributed: u64,
    pub bump: u8,
}

impl TreasuryVault {
    // 8 + 32 + 32 + 32 + 8 + 8 + 1
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1;

    /// Доля владельца машины: 70%
    pub const OWNER_BPS: u64 = 7000;
    /// Доля staking pool: 20%
    pub const STAKING_BPS: u64 = 2000;
    /// Burn (на null-адрес): 10%
    pub const BURN_BPS: u64 = 1000;
}

/// Событие распределения выручки
#[event]
pub struct RevenueEvent {
    pub total_amount: u64,
    pub owner_share: u64,
    pub staking_share: u64,
    pub burn_share: u64,
    pub timestamp: i64,
}
