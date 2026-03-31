import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

function disc(s: string): number[] {
  return Array.from(crypto.createHash("sha256").update(s).digest().slice(0, 8));
}

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ASSOC_TOKEN   = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const SYSTEM        = "11111111111111111111111111111111";

const salePoolSeed  = { kind: "const", value: Array.from(Buffer.from("sale_pool")) };
const saleVaultSeed = { kind: "const", value: Array.from(Buffer.from("sale_vault")) };

const idl = {
  address: "GodxM9254JxPRsmLvDBxuyhjwdKNhccccJrCj1UFdEdB",
  metadata: { name: "vend_sale", version: "0.2.0", spec: "0.1.0" },
  instructions: [
    {
      name: "initialize_sale",
      discriminator: disc("global:initialize_sale"),
      accounts: [
        { name: "authority", writable: true, signer: true },
        { name: "sale_pool", writable: true, pda: { seeds: [salePoolSeed] } },
        { name: "vend_mint" },
        { name: "treasury" },
        { name: "system_program", address: SYSTEM },
      ],
      args: [{ name: "price_lamports", type: "u64" }],
    },
    {
      name: "initialize_vault",
      discriminator: disc("global:initialize_vault"),
      accounts: [
        { name: "authority", writable: true, signer: true },
        { name: "sale_vault", writable: true, pda: { seeds: [saleVaultSeed] } },
        { name: "system_program", address: SYSTEM },
      ],
      args: [],
    },
    {
      name: "fund_vault",
      discriminator: disc("global:fund_vault"),
      accounts: [
        { name: "funder", writable: true, signer: true },
        { name: "sale_vault", writable: true, pda: { seeds: [saleVaultSeed] } },
        { name: "system_program", address: SYSTEM },
      ],
      args: [{ name: "amount_lamports", type: "u64" }],
    },
    {
      name: "buy_tokens",
      discriminator: disc("global:buy_tokens"),
      accounts: [
        { name: "buyer", writable: true, signer: true },
        { name: "sale_pool", writable: true, pda: { seeds: [salePoolSeed] } },
        { name: "vend_mint", writable: true },
        { name: "buyer_ata", writable: true },
        { name: "treasury", writable: true },
        { name: "sale_vault", writable: true, pda: { seeds: [saleVaultSeed] } },
        { name: "token_program", address: TOKEN_PROGRAM },
        { name: "associated_token_program", address: ASSOC_TOKEN },
        { name: "system_program", address: SYSTEM },
      ],
      args: [{ name: "amount_tokens", type: "u64" }],
    },
    {
      name: "sell_tokens",
      discriminator: disc("global:sell_tokens"),
      accounts: [
        { name: "seller", writable: true, signer: true },
        { name: "sale_pool", writable: true, pda: { seeds: [salePoolSeed] } },
        { name: "vend_mint", writable: true },
        { name: "seller_ata", writable: true },
        { name: "sale_vault", writable: true, pda: { seeds: [saleVaultSeed] } },
        { name: "token_program", address: TOKEN_PROGRAM },
        { name: "system_program", address: SYSTEM },
      ],
      args: [{ name: "amount_tokens", type: "u64" }],
    },
    {
      name: "set_active",
      discriminator: disc("global:set_active"),
      accounts: [
        { name: "authority", writable: true, signer: true },
        { name: "sale_pool", writable: true, pda: { seeds: [salePoolSeed] } },
      ],
      args: [{ name: "is_active", type: "bool" }],
    },
  ],
  accounts: [
    { name: "SalePool",  discriminator: disc("account:SalePool")  },
    { name: "SaleVault", discriminator: disc("account:SaleVault") },
  ],
  events: [
    { name: "TokensBoughtEvent", discriminator: disc("event:TokensBoughtEvent") },
    { name: "TokensSoldEvent",   discriminator: disc("event:TokensSoldEvent")   },
  ],
  errors: [
    { code: 6000, name: "ZeroAmount",            msg: "Amount must be greater than zero" },
    { code: 6001, name: "Overflow",              msg: "Math overflow" },
    { code: 6002, name: "SalePaused",            msg: "Sale is paused" },
    { code: 6003, name: "InsufficientLiquidity", msg: "Insufficient vault liquidity" },
  ],
  types: [
    {
      name: "SalePool",
      type: { kind: "struct", fields: [
        { name: "treasury",          type: "pubkey" },
        { name: "vend_mint",         type: "pubkey" },
        { name: "price_lamports",    type: "u64" },
        { name: "total_sold",        type: "u64" },
        { name: "total_revenue",     type: "u64" },
        { name: "total_bought_back", type: "u64" },
        { name: "is_active",         type: "bool" },
        { name: "bump",              type: "u8" },
      ]},
    },
    {
      name: "TokensBoughtEvent",
      type: { kind: "struct", fields: [
        { name: "buyer",         type: "pubkey" },
        { name: "amount_tokens", type: "u64" },
        { name: "sol_paid",      type: "u64" },
        { name: "timestamp",     type: "i64" },
      ]},
    },
    {
      name: "TokensSoldEvent",
      type: { kind: "struct", fields: [
        { name: "seller",        type: "pubkey" },
        { name: "amount_tokens", type: "u64" },
        { name: "sol_received",  type: "u64" },
        { name: "timestamp",     type: "i64" },
      ]},
    },
  ],
};

const out = path.join(process.cwd(), "lib/idl/vend_sale.json");
fs.writeFileSync(out, JSON.stringify(idl, null, 2));
console.log("Written:", out);
