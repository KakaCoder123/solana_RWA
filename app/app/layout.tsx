import type { Metadata } from "next";
import "./globals.css";
import SolanaWalletProvider from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "VendChain — Decentralized Vending Network",
  description: "Invest in real vending machines. Earn daily revenue on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-white">
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
