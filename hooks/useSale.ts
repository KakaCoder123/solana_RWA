'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import IDL from '../lib/idl/vend_sale.json'
import { SALE_PROGRAM_ID, VEND_MINT, VEND_LAMPORTS, SALE_TREASURY, SALE_PRICE_LAMPORTS } from '../lib/anchor'

export interface SalePoolData {
  pricePerVend:    number    // SOL за 1 VEND
  totalSold:       number    // VEND
  totalBoughtBack: number    // VEND
  vaultBalance:    number    // SOL в vault
  isActive:        boolean
  treasury:        PublicKey
}

export interface TradeHistoryEntry {
  type:      'Buy' | 'Sell'
  amount:    number   // VEND
  solAmount: number   // SOL
  wallet:    string   // сокращённый адрес
  signature: string
  time:      string
  ago:       string
}

function getSalePoolPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('sale_pool')], SALE_PROGRAM_ID)[0]
}
function getSaleVaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('sale_vault')], SALE_PROGRAM_ID)[0]
}

function shortAddr(pk: string): string {
  return `${pk.slice(0, 4)}...${pk.slice(-4)}`
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() / 1000) - ts)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function useSale() {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const { publicKey } = useWallet()

  const [pool, setPool] = useState<SalePoolData | null>(null)
  const [history, setHistory] = useState<TradeHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getProgram = useCallback(() => {
    if (!anchorWallet) return null
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })
    return new Program(IDL as any, provider)
  }, [connection, anchorWallet])

  const fetchPool = useCallback(async () => {
    try {
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      }
      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' })
      const program = new Program(IDL as any, provider)

      const [data, vaultLamports] = await Promise.all([
        (program.account as any).salePool.fetch(getSalePoolPda()),
        connection.getBalance(getSaleVaultPda()),
      ])

      setPool({
        pricePerVend:    (data.priceLamports.toNumber() * VEND_LAMPORTS) / LAMPORTS_PER_SOL,
        totalSold:       data.totalSold.toNumber() / VEND_LAMPORTS,
        totalBoughtBack: data.totalBoughtBack.toNumber() / VEND_LAMPORTS,
        vaultBalance:    vaultLamports / LAMPORTS_PER_SOL,
        isActive:        data.isActive,
        treasury:        data.treasury,
      })
    } catch {
      // RPC failed — set pool with known constants so UI still works
      setPool(prev => prev ?? {
        pricePerVend:    (SALE_PRICE_LAMPORTS * VEND_LAMPORTS) / LAMPORTS_PER_SOL,
        totalSold:       0,
        totalBoughtBack: 0,
        vaultBalance:    0,
        isActive:        true,
        treasury:        SALE_TREASURY,
      })
    }
  }, [connection])

  // Получить историю сделок из on-chain логов
  const fetchHistory = useCallback(async () => {
    try {
      const sigs = await connection.getSignaturesForAddress(SALE_PROGRAM_ID, { limit: 10 })
      if (!sigs.length) return

      // Fetch in batches of 5 to avoid 429
      const allTxs = []
      for (let i = 0; i < sigs.length; i += 5) {
        const batch = sigs.slice(i, i + 5)
        const txBatch = await connection.getParsedTransactions(
          batch.map(s => s.signature),
          { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
        )
        allTxs.push(...txBatch)
        if (i + 5 < sigs.length) await new Promise(r => setTimeout(r, 300))
      }
      const txs = allTxs

      const entries: TradeHistoryEntry[] = []

      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i]
        const sig = sigs[i]
        if (!tx || tx.meta?.err) continue

        const logs = tx.meta?.logMessages ?? []

        // Определяем тип по log сообщению программы
        const isBuy  = logs.some(l => l.includes('Bought') && l.includes('raw VEND'))
        const isSell = logs.some(l => l.includes('Sold')   && l.includes('raw VEND'))
        if (!isBuy && !isSell) continue

        // Парсим количество из лога: "Bought 5000000 raw VEND for 5000000 lamports"
        const logLine = logs.find(l => (isBuy ? l.includes('Bought') : l.includes('Sold')) && l.includes('raw VEND'))
        if (!logLine) continue

        const match = logLine.match(/(\d+) raw VEND for (\d+) lamports/)
        if (!match) continue

        const rawVend    = parseInt(match[1])
        const lamports   = parseInt(match[2])
        const amountVend = rawVend / VEND_LAMPORTS
        const amountSol  = lamports / LAMPORTS_PER_SOL

        // Кошелёк подписанта
        const accountKeys = tx.transaction.message.accountKeys
        const signerKey = accountKeys[0]
        const wallet = typeof signerKey === 'object' && 'pubkey' in signerKey
          ? (signerKey as any).pubkey.toBase58()
          : String(signerKey)

        const ts = tx.blockTime ?? 0
        const date = new Date(ts * 1000)
        const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`

        entries.push({
          type:      isBuy ? 'Buy' : 'Sell',
          amount:    amountVend,
          solAmount: amountSol,
          wallet:    shortAddr(wallet),
          signature: sig.signature,
          time:      timeStr,
          ago:       timeAgo(ts),
        })
      }

      setHistory(entries)
    } catch { /* RPC issues — не критично */ }
  }, [connection])

  useEffect(() => {
    fetchPool()
    fetchHistory()
  }, [fetchPool, fetchHistory])

  // Купить VEND токены
  const buyTokens = useCallback(async (amountRaw: number) => {
    if (!publicKey) throw new Error('Wallet not connected')
    const program = getProgram()
    if (!program) throw new Error('Program not ready')

    setLoading(true)
    setError(null)
    try {
      const rawAmount = new BN(Math.floor(amountRaw * VEND_LAMPORTS))
      const buyerAta  = getAssociatedTokenAddressSync(VEND_MINT, publicKey)
      // Use cached pool treasury if available, else fall back to known constant
      const treasury  = pool?.treasury ?? SALE_TREASURY

      await (program.methods as any)
        .buyTokens(rawAmount)
        .accounts({
          buyer:    publicKey,
          vendMint: VEND_MINT,
          buyerAta: buyerAta,
          treasury,
        })
        .rpc()

      await Promise.all([fetchPool(), fetchHistory()])
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [publicKey, pool, getProgram, fetchPool, fetchHistory])

  // Продать VEND токены
  const sellTokens = useCallback(async (amountVend: number) => {
    if (!publicKey) throw new Error('Wallet not connected')
    const program = getProgram()
    if (!program) throw new Error('Program not ready')

    setLoading(true)
    setError(null)
    try {
      const rawAmount  = new BN(Math.floor(amountVend * VEND_LAMPORTS))
      const sellerAta  = getAssociatedTokenAddressSync(VEND_MINT, publicKey)

      await (program.methods as any)
        .sellTokens(rawAmount)
        .accounts({
          seller:    publicKey,
          vendMint:  VEND_MINT,
          sellerAta: sellerAta,
        })
        .rpc()

      await Promise.all([fetchPool(), fetchHistory()])
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [publicKey, getProgram, fetchPool, fetchHistory])

  return { pool, history, loading, error, buyTokens, sellTokens, refresh: fetchPool }
}
