'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

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

      // VEND balance — use getParsedTokenAccountsByOwner
      let vendBalance = 0
      if (vendMint) {
        try {
          console.log('[useWalletData] fetching VEND for', publicKey.toBase58(), 'mint:', vendMint.toBase58())
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { mint: vendMint }
          )
          console.log('[useWalletData] token accounts:', tokenAccounts.value.length)
          if (tokenAccounts.value.length > 0) {
            const data = (tokenAccounts.value[0].account.data as any)?.parsed?.info?.tokenAmount
            console.log('[useWalletData] tokenAmount data:', data)
            vendBalance = data?.uiAmount ?? 0
          }
        } catch (e) {
          console.warn('[useWalletData] VEND fetch failed:', e)
          vendBalance = 0
        }
      } else {
        console.warn('[useWalletData] vendMint is null/undefined — skipping VEND fetch')
      }

      console.log('[useWalletData] setAssets → SOL:', solBalance, 'VEND:', vendBalance)
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
