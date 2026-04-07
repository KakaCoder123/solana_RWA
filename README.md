# VendChain — RWA Tokenization on Solana

> **Invest in a network of vending machines and earn every day**

VendChain is the first Real World Asset (RWA) tokenization platform on Solana. Users buy VEND tokens to become co-owners of a physical vending machine network and receive automatic revenue share from every sale.

Submitted to **Solana National Hackathon / Decentrathon 2026**.

---

## The Problem

- Vending machines generate real daily cashflow — but are closed to ordinary investors
- Minimum entry to real assets: thousands of dollars + banks + KYC
- Machine owners cannot attract capital without intermediaries
- Traditional fintech platforms require registration, verification, and trust

## The Solution

**Three steps to passive income:**

1. **Connect wallet** — Phantom, Solflare or Backpack. No registration, no KYC — just sign a transaction
2. **Buy VEND tokens** — each token entitles the holder to a share of the entire network's revenue
3. **Earn daily** — smart contracts automatically distribute revenue; withdraw at any time

**Two ways to earn:**
| Method | APY | Mechanism |
|--------|-----|-----------|
| Revenue Share | Variable | Proportional to VEND holdings |
| Staking | 10% | Lock VEND in smart contract |

---

## Why Solana (not just by name)

> Remove Solana — the project breaks or becomes unprofitable.

| Criterion | Solana | Ethereum | BSC |
|-----------|--------|----------|-----|
| Fee per payout | **$0.00025** | $5–50 | $0.05–0.5 |
| Finalization | **400ms** | 12–60s | 3–5s |
| $2 sale payout | Profitable | Loss | Borderline |
| Solana Pay (QR) | Native | No | No |
| Token-2022 Hooks | Yes | No | No |

**Concrete Solana features used:**
- **PDAs (Program Derived Addresses)** — each machine has a deterministic on-chain address derived from `program + seed`. No private key, no database
- **SPL Token + Metaplex Metadata** — VEND token with on-chain name, symbol and logo visible in Phantom/Solflare
- **Anchor Framework** — staking pool, sale pool, machine registry — all on-chain
- **Solana Pay** — QR payment at the machine, 400ms finalization

---

## Architecture

```
User Wallet (Phantom)
        │
        ▼
  Next.js Frontend
        │
   ┌────┴────┐
   │         │
Anchor SDK  Supabase
   │         │
   ▼         ▼
Solana     Machine
Devnet     Registry
   │
   ├── vendchain_contracts   (staking pool, rewards)
   ├── vend_sale             (VEND token sale)
   └── vend_machine          (machine registry, record_sale)
```

**Smart Contracts (Rust / Anchor):**
- `vendchain_contracts` — staking pool, user stakes, reward distribution
- `vend_sale` — VEND token sale for SOL, sale vault
- `vend_machine` — on-chain machine registry, records sales

**Frontend:**
- Next.js 15 + TypeScript
- `@coral-xyz/anchor` — smart contract interaction
- `@solana/wallet-adapter` — Phantom, Solflare, Backpack
- Supabase — machine database and real-time status

**Token:**
- Mint: `CNFeMq6S9BMbsHbWTYBVCkjvQJ95UX5gmrVn95nerDeZ` (Solana Devnet)
- Standard: SPL Token with Metaplex metadata
- Name: **VendChain** · Symbol: **VEND** · Decimals: 6
- Price: 1 SOL = 1,000 VEND

---

## Live Demo (Devnet)

| Page | Description |
|------|-------------|
| `/` | Landing with live transaction ticker |
| `/vending` | Buy VEND for SOL (real on-chain tx) |
| `/staking` | Stake / Unstake / Claim rewards |
| `/investor` | Investor dashboard with machine network |
| `/trade` | Secondary market |

**On-chain state (devnet):**
- Sale Vault: ~28 SOL
- Reward Vault: ~9,500 VEND
- Staking APY: 10%
- Program ID: `9T4YTDnoA1KQyVmcyEqJug5jWkXEjyi6WLw2uKr9kowK`

---

## Getting Started

### Prerequisites

- Node.js 18+
- Phantom wallet (set to Solana Devnet)

### Installation

```bash
git clone https://github.com/KakaCoder123/solana_RWA
cd solana_RWA
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Script | Description |
|--------|-------------|
| `npx tsx scripts/airdrop-vend.ts <ADDRESS>` | Airdrop VEND to wallet |
| `npx tsx scripts/fund-rewards.ts` | Fund staking reward vault |
| `npx tsx scripts/emit-rewards.ts` | Distribute rewards to stakers (ONLINE machines only) |
| `npx tsx scripts/reinit-staking-pool.ts` | Re-initialize staking pool |
| `npx tsx scripts/update-vend-metadata.ts` | Update token metadata on-chain |

---

## Scaling Potential

- **Market:** vending — $50B/year globally, growing 8% annually
- **Network:** 500+ machines planned across Kazakhstan (Almaty, Astana, Shymkent)
- **Model scales:** any physical cashflow asset → tokenized through the same architecture (parking, laundromats, EV charging)
- **No geographic ceiling:** Solana works globally, no local banking licenses needed
- **Network effect:** more machines → more revenue → higher yield → more investors → capital for new machines

---

## Tech Stack

![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor_Framework-512BD4?style=flat)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

---

## Contact

Built for **Decentrathon 2026 — Solana National Hackathon**

- Telegram: [@KakaCoder](https://t.me/KakaCoder)
- GitHub: [KakaCoder123](https://github.com/KakaCoder123)
