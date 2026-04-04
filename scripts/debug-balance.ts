/**
 * Диагностика: проверяем все способы получить баланс VEND токена
 * Запуск: npx tsx scripts/debug-balance.ts <WALLET_ADDRESS>
 *
 * Если адрес не передан — используем тестовый кошелёк из предыдущей сессии
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const RPC_URL = "https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39";
const VEND_MINT = new PublicKey("CNFeMq6S9BMbsHbWTYBVCkjvQJ95UX5gmrVn95nerDeZ");

async function main() {
  const walletArg = process.argv[2];
  if (!walletArg) {
    console.error("Usage: npx tsx scripts/debug-balance.ts <WALLET_ADDRESS>");
    process.exit(1);
  }

  const wallet = new PublicKey(walletArg);
  const connection = new Connection(RPC_URL, "confirmed");

  console.log("=== VendChain Balance Debug ===");
  console.log("Wallet  :", wallet.toBase58());
  console.log("VEND Mint:", VEND_MINT.toBase58());
  console.log("RPC     :", RPC_URL.replace(/api-key=.+/, "api-key=***"));
  console.log("");

  // 1. SOL balance
  try {
    const lamports = await connection.getBalance(wallet);
    console.log(`[1] SOL balance: ${lamports / LAMPORTS_PER_SOL} SOL`);
  } catch (e) {
    console.error("[1] getBalance FAILED:", e);
  }

  // 2. ATA address
  const ata = getAssociatedTokenAddressSync(VEND_MINT, wallet);
  console.log(`[2] ATA address: ${ata.toBase58()}`);

  // 3. ATA account info (raw)
  try {
    const info = await connection.getAccountInfo(ata);
    if (!info) {
      console.log("[3] getAccountInfo: ATA does NOT exist on-chain");
    } else {
      console.log(`[3] getAccountInfo: ATA exists, ${info.data.length} bytes, owner: ${info.owner.toBase58()}`);
    }
  } catch (e) {
    console.error("[3] getAccountInfo FAILED:", e);
  }

  // 4. getTokenAccountBalance (старый метод)
  try {
    const result = await connection.getTokenAccountBalance(ata);
    console.log(`[4] getTokenAccountBalance: ${result.value.uiAmount} VEND (raw: ${result.value.amount})`);
  } catch (e: any) {
    console.error("[4] getTokenAccountBalance FAILED:", e?.message ?? e);
  }

  // 5. getParsedTokenAccountsByOwner (новый метод)
  try {
    const result = await connection.getParsedTokenAccountsByOwner(wallet, { mint: VEND_MINT });
    console.log(`[5] getParsedTokenAccountsByOwner: found ${result.value.length} account(s)`);
    for (const acc of result.value) {
      const data = (acc.account.data as any)?.parsed?.info?.tokenAmount;
      console.log(`    - ${acc.pubkey.toBase58()}: ${data?.uiAmount} VEND (raw: ${data?.amount})`);
    }
  } catch (e: any) {
    console.error("[5] getParsedTokenAccountsByOwner FAILED:", e?.message ?? e);
  }

  // 6. getParsedAccountInfo на ATA
  try {
    const result = await connection.getParsedAccountInfo(ata);
    if (!result.value) {
      console.log("[6] getParsedAccountInfo: no data");
    } else {
      const data = (result.value.data as any)?.parsed?.info?.tokenAmount;
      console.log(`[6] getParsedAccountInfo: ${data?.uiAmount} VEND (raw: ${data?.amount})`);
    }
  } catch (e: any) {
    console.error("[6] getParsedAccountInfo FAILED:", e?.message ?? e);
  }
}

main();
