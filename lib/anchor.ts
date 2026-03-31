import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey('9T4YTDnoA1KQyVmcyEqJug5jWkXEjyi6WLw2uKr9kowK')
export const SALE_PROGRAM_ID = new PublicKey('GodxM9254JxPRsmLvDBxuyhjwdKNhccccJrCj1UFdEdB')
export const VEND_MINT = new PublicKey('4nr5wxpSUUZKpePSu8S5MDSRPd5EZ4Lm67S97EGrLY4B')
// Treasury = deployer wallet (set during initialize_sale)
export const SALE_TREASURY = new PublicKey('2Xxc4uMPpfGJJtxEXV2SfP34tQ8n56mYZEw26n79LPaw')
// On-chain price: 1000 lamports per raw unit → 1 VEND (10^6 raw) = 1 SOL
export const SALE_PRICE_LAMPORTS = 1000

export const VEND_DECIMALS = 6
export const VEND_LAMPORTS = 10 ** VEND_DECIMALS

export function getStakingPoolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('staking_pool')], PROGRAM_ID)
  return pda
}

export function getUserStakePda(owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('user_stake'), owner.toBuffer()],
    PROGRAM_ID
  )
  return pda
}

export function getUnstakeRequestPda(owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('unstake'), owner.toBuffer()],
    PROGRAM_ID
  )
  return pda
}
