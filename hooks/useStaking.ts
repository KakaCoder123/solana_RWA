'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import IDL from '../lib/idl/vendchain_contracts.json'
import {
  PROGRAM_ID,
  VEND_LAMPORTS,
  getStakingPoolPda,
  getUserStakePda,
  getUnstakeRequestPda,
} from '../lib/anchor'

export interface PoolData {
  totalStaked: number       // VEND (human-readable)
  rewardRateBps: number     // e.g. 1000 = 10% APY
  rewardsAvailable: number  // VEND
  vendMint: PublicKey
}

export interface UserStakeData {
  stakedAmount: number   // VEND
  pendingRewards: number // VEND
}

export interface UnstakeRequestData {
  amount: number
  unlockTs: number
  isUnlocked: boolean
  secondsLeft: number
}

export function useStaking() {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const { publicKey } = useWallet()

  const [pool, setPool] = useState<PoolData | null>(null)
  const [userStake, setUserStake] = useState<UserStakeData | null>(null)
  const [unstakeRequest, setUnstakeRequest] = useState<UnstakeRequestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getProgram = useCallback(() => {
    if (!anchorWallet) return null
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program(IDL as any, provider)
  }, [connection, anchorWallet])

  const fetchPool = useCallback(async () => {
    // Pool is public — readable without wallet
    const provider = new AnchorProvider(
      connection,
      { publicKey: PublicKey.default, signTransaction: async (t) => t, signAllTransactions: async (t) => t },
      { commitment: 'confirmed' }
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(IDL as any, provider)
    try {
      const poolPda = getStakingPoolPda()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc = await (program.account as any).stakingPool.fetch(poolPda)
      setPool({
        totalStaked: acc.totalStaked.toNumber() / VEND_LAMPORTS,
        rewardRateBps: acc.rewardRateBps.toNumber(),
        rewardsAvailable: acc.rewardsAvailable.toNumber() / VEND_LAMPORTS,
        vendMint: acc.vendMint,
      })
    } catch {
      setPool(null)
    }
  }, [connection])

  const fetchUserData = useCallback(async () => {
    if (!publicKey) { setUserStake(null); setUnstakeRequest(null); return }
    const program = getProgram()
    if (!program) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc = await (program.account as any).userStake.fetch(getUserStakePda(publicKey))
      setUserStake({
        stakedAmount: acc.stakedAmount.toNumber() / VEND_LAMPORTS,
        pendingRewards: acc.pendingRewards.toNumber() / VEND_LAMPORTS,
      })
    } catch {
      setUserStake(null)
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc = await (program.account as any).unstakeRequest.fetch(getUnstakeRequestPda(publicKey))
      const unlockTs = acc.unlockTs.toNumber()
      const nowSec = Date.now() / 1000
      setUnstakeRequest({
        amount: acc.amount.toNumber() / VEND_LAMPORTS,
        unlockTs,
        isUnlocked: nowSec > unlockTs,
        secondsLeft: Math.max(0, unlockTs - nowSec),
      })
    } catch {
      setUnstakeRequest(null)
    }
  }, [publicKey, getProgram])

  const refresh = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchPool(), fetchUserData()])
    setLoading(false)
  }, [fetchPool, fetchUserData])

  useEffect(() => { refresh() }, [refresh])

  // ── Actions ───────────────────────────────────────────────────────

  const stake = async (amountVend: number) => {
    if (!publicKey || !pool) return
    const program = getProgram()
    if (!program) return
    setTxLoading(true)
    setError(null)
    try {
      const userAta = getAssociatedTokenAddressSync(pool.vendMint, publicKey)
      const raw = new BN(Math.floor(amountVend * VEND_LAMPORTS))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any).stake(raw).accounts({
        owner: publicKey,
        userTokenAccount: userAta,
      }).rpc()
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setTxLoading(false)
    }
  }

  const requestUnstake = async (amountVend: number) => {
    if (!publicKey) return
    const program = getProgram()
    if (!program) return
    setTxLoading(true)
    setError(null)
    try {
      const raw = new BN(Math.floor(amountVend * VEND_LAMPORTS))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any).requestUnstake(raw).accounts({
        owner: publicKey,
      }).rpc()
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setTxLoading(false)
    }
  }

  const withdraw = async () => {
    if (!publicKey || !pool) return
    const program = getProgram()
    if (!program) return
    setTxLoading(true)
    setError(null)
    try {
      const userAta = getAssociatedTokenAddressSync(pool.vendMint, publicKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any).withdraw().accounts({
        owner: publicKey,
        userTokenAccount: userAta,
      }).rpc()
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setTxLoading(false)
    }
  }

  const claimRewards = async () => {
    if (!publicKey || !pool) return
    const program = getProgram()
    if (!program) return
    setTxLoading(true)
    setError(null)
    try {
      const userAta = getAssociatedTokenAddressSync(pool.vendMint, publicKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any).claimRewards().accounts({
        owner: publicKey,
        userTokenAccount: userAta,
      }).rpc()
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setTxLoading(false)
    }
  }

  // APY as percent
  const apyPercent = pool ? pool.rewardRateBps / 100 : 0

  return {
    pool,
    userStake,
    unstakeRequest,
    loading,
    txLoading,
    error,
    apyPercent,
    stake,
    requestUnstake,
    withdraw,
    claimRewards,
    refresh,
    clearError: () => setError(null),
  }
}
