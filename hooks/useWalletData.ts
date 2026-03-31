'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'

export interface WalletAssets {
  solBalance: number      // SOL
  vendBalance: number     // VEND (human-readable, 6 decimals)
}

export interface RecentTx {
  signature: string
  shortSig: string
  blockTime: number | null
  dateStr: string
}

export function useWalletData(vendMint: PublicKey | null) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  const [assets, setAssets] = useState<WalletAssets>({ solBalance: 0, vendBalance: 0 })
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssets = useCallback(async () => {
    if (!publicKey) { setLoading(false); return }

    setLoading(true)
    try {
      // SOL balance
      const lamports = await connection.getBalance(publicKey)
      const solBalance = lamports / LAMPORTS_PER_SOL

      // VEND balance
      let vendBalance = 0
      if (vendMint) {
        try {
          const ata = getAssociatedTokenAddressSync(vendMint, publicKey)
          const info = await connection.getTokenAccountBalance(ata)
          vendBalance = info.value.uiAmount ?? 0
        } catch {
          vendBalance = 0
        }
      }

      setAssets({ solBalance, vendBalance })

      // Recent transactions (last 5)
      const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 5 })
      setRecentTxs(sigs.map(s => ({
        signature: s.signature,
        shortSig: `${s.signature.slice(0, 4)}...${s.signature.slice(-4)}`,
        blockTime: s.blockTime ?? null,
        dateStr: s.blockTime
          ? new Date(s.blockTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Pending',
      })))
    } catch (e) {
      console.error('useWalletData error:', e)
    } finally {
      setLoading(false)
    }
  }, [publicKey, connection, vendMint])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  return { assets, recentTxs, loading, refresh: fetchAssets }
}
