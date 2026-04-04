/**
 * Создаёт новый VEND токен с Metaplex metadata
 * Деплоер = mint authority → может подписать createMetadata напрямую
 *
 * Запуск: npx tsx scripts/create-vend-token.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
  createFungible,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata'
import {
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  signerIdentity,
  keypairIdentity,
} from '@metaplex-foundation/umi'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import * as fs from 'fs'
import { Keypair } from '@solana/web3.js'

const RPC = 'https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39'

// Metadata URI — можно заменить на Arweave/IPFS в проде
const METADATA_URI = 'https://raw.githubusercontent.com/KakaCoder123/solana_RWA/main/public/vend-metadata.json'

async function main() {
  const umi = createUmi(RPC).use(mplTokenMetadata())

  // Загружаем keypair деплоера
  const raw = JSON.parse(fs.readFileSync('C:/solana/id.json', 'utf-8'))
  const web3Keypair = Keypair.fromSecretKey(Buffer.from(raw))
  const deployer = createSignerFromKeypair(umi, fromWeb3JsKeypair(web3Keypair))
  umi.use(keypairIdentity(deployer))

  // Генерируем keypair для нового минта
  const mintKeypair = generateSigner(umi)
  console.log('New VEND mint address:', mintKeypair.publicKey)
  console.log('Deployer (authority):', deployer.publicKey)

  console.log('\nCreating fungible token with metadata...')
  const { signature } = await createFungible(umi, {
    mint: mintKeypair,
    name: 'VendChain Token',
    symbol: 'VEND',
    uri: METADATA_URI,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: 6,
    isMutable: true,
  }).sendAndConfirm(umi)

  console.log('✅ Token created! Sig:', Buffer.from(signature).toString('base64').slice(0, 20) + '...')
  console.log('\n🔑 NEW VEND MINT:', mintKeypair.publicKey)
  console.log('\n⚠️  Обновите VEND_MINT во всех скриптах и конфигах:')
  console.log('   lib/anchor.ts')
  console.log('   scripts/*.ts')
  console.log('   .env.local (если есть)')

  // Сохраняем в файл
  fs.writeFileSync('scripts/.vend-mint.json', JSON.stringify({
    mint: mintKeypair.publicKey,
    authority: deployer.publicKey,
  }, null, 2))
  console.log('\nАдрес сохранён в scripts/.vend-mint.json')
}

main().catch(console.error)
