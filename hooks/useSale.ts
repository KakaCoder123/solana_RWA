'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
  PublicKey, LAMPORTS_PER_SOL, Transaction, TransactionInstruction, SystemProgram,
} from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import IDL from '../lib/idl/vend_sale.json'
import { SALE_PROGRAM_ID, VEND_MINT, VEND_LAMPORTS, SALE_TREASURY, SALE_PRICE_LAMPORTS } from '../lib/anchor'

// ── Precomputed discriminators (sha256("global:{ix}")[0..8]) ──────────────────
const BUY_DISC  = new Uint8Array([189, 21, 230, 133, 247,   2, 110,  42])
const SELL_DISC = new Uint8Array([114, 242,  25,  12,  62, 126,  92,   2])

function u64le(n: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  const lo = n >>> 0
  const hi = Math.floor(n / 0x100000000) >>> 0
  view.setUint32(0, lo, true)
  view.setUint32(4, hi, true)
  return new Uint8Array(buf)
}

export interface SalePoolData {
  pricePerVend:    number
  totalSold:       number
  totalBoughtBack: number
  vaultBalance:    number
  isActive:        boolean
  treasury:        PublicKey
}

export interface TradeHistoryEntry {
  type:      'Buy' | 'Sell'
  amount:    number
  solAmount: number
  wallet:    string
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
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function useSale() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const [pool,    setPool]    = useState<SalePoolData | null>(null)
  const [history, setHistory] = useState<TradeHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Fetch pool state ────────────────────────────────────────────────────────
  const fetchPool = useCallback(async () => {
    try {
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      }
      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' })
      const program   = new Program(IDL as any, provider)

      const [data, vaultLamports] = await Promise.all([
        (program.account as any).salePool.fetch(getSalePoolPda()),
        connection.getBalance(getSaleVaultPda()),
      ])

      setPool({
        pricePerVend:    (data.priceLamports.toNumber() * VEND_LAMPORTS) / LAMPORTS_PER_SOL,
        totalSold:       data.totalSold.toNumber()       / VEND_LAMPORTS,
        totalBoughtBack: data.totalBoughtBack.toNumber() / VEND_LAMPORTS,
        vaultBalance:    vaultLamports / LAMPORTS_PER_SOL,
        isActive:        data.isActive,
        treasury:        data.treasury,
      })
    } catch {
      // Fallback to on-chain constants if RPC fails
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

  // ── Fetch on-chain trade history ────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const sigs = await connection.getSignaturesForAddress(SALE_PROGRAM_ID, { limit: 10 })
      if (!sigs.length) return

      const entries: TradeHistoryEntry[] = []
      for (let i = 0; i < sigs.length; i += 5) {
        const batch = sigs.slice(i, i + 5)
        const txs   = await connection.getParsedTransactions(
          batch.map(s => s.signature),
          { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
        )
        for (let j = 0; j < txs.length; j++) {
          const tx  = txs[j]
          const sig = batch[j]
          if (!tx || tx.meta?.err) continue

          const logs  = tx.meta?.logMessages ?? []
          const isBuy  = logs.some(l => l.includes('Bought') && l.includes('raw VEND'))
          const isSell = logs.some(l => l.includes('Sold')   && l.includes('raw VEND'))
          if (!isBuy && !isSell) continue

          const logLine = logs.find(l =>
            (isBuy ? l.includes('Bought') : l.includes('Sold')) && l.includes('raw VEND')
          )
          if (!logLine) continue
          const match = logLine.match(/(\d+) raw VEND for (\d+) lamports/)
          if (!match) continue

          const rawVend    = parseInt(match[1])
          const lamports   = parseInt(match[2])
          const amountVend = rawVend   / VEND_LAMPORTS
          const amountSol  = lamports  / LAMPORTS_PER_SOL

          const accountKeys = tx.transaction.message.accountKeys
          const signerKey   = accountKeys[0]
          const wallet = typeof signerKey === 'object' && 'pubkey' in signerKey
            ? (signerKey as any).pubkey.toBase58()
            : String(signerKey)

          const ts   = tx.blockTime ?? 0
          const date = new Date(ts * 1000)
          entries.push({
            type:      isBuy ? 'Buy' : 'Sell',
            amount:    amountVend,
            solAmount: amountSol,
            wallet:    shortAddr(wallet),
            signature: sig.signature,
            time:      `${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`,
            ago:       timeAgo(ts),
          })
        }
        if (i + 5 < sigs.length) await new Promise(r => setTimeout(r, 300))
      }
      setHistory(entries)
    } catch { /* RPC issues — not critical */ }
  }, [connection])

  useEffect(() => {
    fetchPool()
    fetchHistory()
  }, [fetchPool, fetchHistory])

  // ── Buy VEND (raw instruction — bypasses Anchor client-side validation) ─────
  const buyTokens = useCallback(async (amountVend: number) => {
    if (!publicKey) throw new Error('Wallet not connected')

    setLoading(true)
    setError(null)
    try {
      const rawUnits  = Math.floor(amountVend * VEND_LAMPORTS)
      const amtBytes  = u64le(rawUnits)
      const merged    = new Uint8Array(BUY_DISC.length + amtBytes.length)
      merged.set(BUY_DISC, 0); merged.set(amtBytes, BUY_DISC.length)
      const data      = Buffer.from(merged)
      const buyerAta  = getAssociatedTokenAddressSync(VEND_MINT, publicKey)
      const salePool  = getSalePoolPda()
      const saleVault = getSaleVaultPda()
      const treasury  = pool?.treasury ?? SALE_TREASURY

      const ix = new TransactionInstruction({
        programId: SALE_PROGRAM_ID,
        keys: [
          { pubkey: publicKey,                   isSigner: true,  isWritable: true  },
          { pubkey: salePool,                    isSigner: false, isWritable: true  },
          { pubkey: VEND_MINT,                   isSigner: false, isWritable: true  },
          { pubkey: buyerAta,                    isSigner: false, isWritable: true  },
          { pubkey: treasury,                    isSigner: false, isWritable: true  },
          { pubkey: saleVault,                   isSigner: false, isWritable: true  },
          { pubkey: TOKEN_PROGRAM_ID,            isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
        ],
        data,
      })

      const tx  = new Transaction().add(ix)
      const sig = await sendTransaction(tx, connection, { skipPreflight: false })
      await connection.confirmTransaction(sig, 'confirmed')

      await Promise.all([fetchPool(), fetchHistory()])
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [publicKey, pool, connection, sendTransaction, fetchPool, fetchHistory])

  // ── Sell VEND (raw instruction) ─────────────────────────────────────────────
  const sellTokens = useCallback(async (amountVend: number) => {
    if (!publicKey) throw new Error('Wallet not connected')

    setLoading(true)
    setError(null)
    try {
      const rawUnits  = Math.floor(amountVend * VEND_LAMPORTS)
      const amtBytes  = u64le(rawUnits)
      const merged    = new Uint8Array(SELL_DISC.length + amtBytes.length)
      merged.set(SELL_DISC, 0); merged.set(amtBytes, SELL_DISC.length)
      const data      = Buffer.from(merged)
      const sellerAta = getAssociatedTokenAddressSync(VEND_MINT, publicKey)
      const salePool  = getSalePoolPda()
      const saleVault = getSaleVaultPda()

      const ix = new TransactionInstruction({
        programId: SALE_PROGRAM_ID,
        keys: [
          { pubkey: publicKey,               isSigner: true,  isWritable: true  },
          { pubkey: salePool,                isSigner: false, isWritable: true  },
          { pubkey: VEND_MINT,               isSigner: false, isWritable: true  },
          { pubkey: sellerAta,               isSigner: false, isWritable: true  },
          { pubkey: saleVault,               isSigner: false, isWritable: true  },
          { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      })

      const tx  = new Transaction().add(ix)
      const sig = await sendTransaction(tx, connection, { skipPreflight: false })
      await connection.confirmTransaction(sig, 'confirmed')

      await Promise.all([fetchPool(), fetchHistory()])
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [publicKey, connection, sendTransaction, fetchPool, fetchHistory])

  return { pool, history, loading, error, buyTokens, sellTokens, refresh: fetchPool }
}
