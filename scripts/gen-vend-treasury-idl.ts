import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

function discriminator(preimage: string): number[] {
  const hash = crypto.createHash("sha256").update(preimage).digest();
  return Array.from(hash.slice(0, 8));
}

const BURN_ADDRESS = "1nc1nerator11111111111111111111111111111111";

const idl = {
  address: "JBVJhEat5c7NEhJJcmnoc32ZrS7P1WHMaa2maQxCDJP8",
  metadata: {
    name: "vend_treasury",
    version: "0.1.0",
    spec: "0.1.0",
    description: "VendChain revenue split: 70% owner / 20% staking / 10% burn",
  },
  instructions: [
    {
      name: "initialize_treasury",
      discriminator: discriminator("global:initialize_treasury"),
      accounts: [
        { name: "authority", writable: true, signer: true },
        {
          name: "treasury",
          writable: true,
          pda: { seeds: [{ kind: "const", value: Array.from(Buffer.from("treasury")) }] },
        },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "machine_owner", type: "pubkey" },
        { name: "staking_vault", type: "pubkey" },
      ],
    },
    {
      name: "split_revenue",
      discriminator: discriminator("global:split_revenue"),
      accounts: [
        { name: "payer", writable: true, signer: true },
        {
          name: "treasury",
          writable: true,
          pda: { seeds: [{ kind: "const", value: Array.from(Buffer.from("treasury")) }] },
        },
        { name: "machine_owner", writable: true },
        { name: "staking_vault", writable: true },
        { name: "burn_address", writable: true, address: BURN_ADDRESS },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "amount_lamports", type: "u64" },
      ],
    },
  ],
  accounts: [
    {
      name: "TreasuryVault",
      discriminator: discriminator("account:TreasuryVault"),
    },
  ],
  events: [
    {
      name: "RevenueEvent",
      discriminator: discriminator("event:RevenueEvent"),
    },
  ],
  errors: [
    { code: 6000, name: "ZeroAmount", msg: "Amount must be greater than zero" },
    { code: 6001, name: "Overflow", msg: "Math overflow" },
    { code: 6002, name: "Unauthorized", msg: "Only authority can perform this action" },
    { code: 6003, name: "InvalidStakingVault", msg: "Invalid staking vault account" },
    { code: 6004, name: "InvalidMachineOwner", msg: "Invalid machine owner account" },
  ],
  types: [
    {
      name: "TreasuryVault",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "machine_owner", type: "pubkey" },
          { name: "staking_vault", type: "pubkey" },
          { name: "total_collected", type: "u64" },
          { name: "total_distributed", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "RevenueEvent",
      type: {
        kind: "struct",
        fields: [
          { name: "total_amount", type: "u64" },
          { name: "owner_share", type: "u64" },
          { name: "staking_share", type: "u64" },
          { name: "burn_share", type: "u64" },
          { name: "timestamp", type: "i64" },
        ],
      },
    },
  ],
};

const out = path.join(process.cwd(), "lib/idl/vend_treasury.json");
fs.writeFileSync(out, JSON.stringify(idl, null, 2));
console.log("Written:", out);
console.log("\nDiscriminators:");
for (const ix of idl.instructions) {
  console.log(`  ${ix.name}: [${ix.discriminator.join(",")}]`);
}
