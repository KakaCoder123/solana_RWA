/**
 * Обновляет URI метаданных существующего VEND токена
 * Запуск: npx tsx scripts/update-vend-metadata.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplTokenMetadata, updateV1, fetchMetadataFromSeeds } from '@metaplex-foundation/mpl-token-metadata'
import { createSignerFromKeypair, keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair } from '@solana/web3.js'
import * as fs from 'fs'

const RPC = 'https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39'
const VEND_MINT = 'CNFeMq6S9BMbsHbWTYBVCkjvQJ95UX5gmrVn95nerDeZ'
const METADATA_URI = 'https://raw.githubusercontent.com/KakaCoder123/solana_RWA/main/public/vend-metadata.json'

async function main() {
  const umi = createUmi(RPC).use(mplTokenMetadata())

  const raw = JSON.parse(fs.readFileSync('C:/solana/id.json', 'utf-8'))
  const web3Keypair = Keypair.fromSecretKey(Buffer.from(raw))
  const deployer = createSignerFromKeypair(umi, fromWeb3JsKeypair(web3Keypair))
  umi.use(keypairIdentity(deployer))

  const mint = publicKey(VEND_MINT)
  const metadata = await fetchMetadataFromSeeds(umi, { mint })

  console.log('Current URI:', metadata.uri)
  console.log('Updating to:', METADATA_URI)

  const { signature } = await updateV1(umi, {
    mint,
    authority: deployer,
    data: {
      ...metadata,
      uri: METADATA_URI,
    },
  }).sendAndConfirm(umi)

  console.log('✅ Metadata updated! Sig:', Buffer.from(signature).toString('base64').slice(0, 20) + '...')
  console.log('Кошельки подтянут новое лого в течение нескольких минут.')
}

main().catch(console.error)
