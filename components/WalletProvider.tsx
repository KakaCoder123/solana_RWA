'use client'

import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl, ConnectionConfig } from '@solana/web3.js'

import '@solana/wallet-adapter-react-ui/styles.css'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl(WalletAdapterNetwork.Devnet)
const CONNECTION_CONFIG: ConnectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
}

export default function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => RPC_URL, [])
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
    new BackpackWalletAdapter(),
  ], [network])

  return (
    <ConnectionProvider endpoint={endpoint} config={CONNECTION_CONFIG}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
