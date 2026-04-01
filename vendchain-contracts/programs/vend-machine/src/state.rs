use anchor_lang::prelude::*;

/// Global registry — одна на всю программу
#[account]
pub struct MachineRegistry {
    pub authority: Pubkey,
    pub total_machines: u64,
    pub total_revenue: u64,   // в lamports (SOL * 10^9)
    pub bump: u8,
}
impl MachineRegistry {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1;
}

/// Каждая торговая машина — отдельный PDA
/// seeds = [b"machine", machine_id]
#[account]
pub struct MachineAccount {
    pub owner: Pubkey,
    pub machine_id: [u8; 16],  // UTF-8, дополняется нулями
    pub location: [u8; 64],    // UTF-8 строка локации
    pub total_revenue: u64,    // lamports
    pub total_sales: u64,
    pub is_active: bool,
    pub registered_at: i64,
    pub last_sale_at: i64,
    pub bump: u8,
}
impl MachineAccount {
    pub const LEN: usize = 8 + 32 + 16 + 64 + 8 + 8 + 1 + 8 + 8 + 1;

    pub fn machine_id_str(&self) -> &str {
        let end = self.machine_id.iter().position(|&b| b == 0).unwrap_or(16);
        std::str::from_utf8(&self.machine_id[..end]).unwrap_or("UNKNOWN")
    }
}

/// Одна продажа — событие (лог), не отдельный аккаунт
/// Эмитится через emit!() для Helius / web3 подписчиков
#[event]
pub struct SaleEvent {
    pub machine_id: [u8; 16],
    pub buyer: Pubkey,
    pub amount_lamports: u64,
    pub timestamp: i64,
}
