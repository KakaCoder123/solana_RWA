/**
 * Generates IDL JSON for the vend_machine Anchor program.
 * Anchor discriminators = first 8 bytes of sha256("global:{ix}" | "account:{Account}")
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

function discriminator(preimage: string): number[] {
  const hash = crypto.createHash("sha256").update(preimage).digest();
  return Array.from(hash.slice(0, 8));
}

const idl = {
  address: "6P7dyj9tyxw9zZbG6ZmJGVVYwWpWUqpYaXcgcH9MGpFw",
  metadata: {
    name: "vend_machine",
    version: "0.1.0",
    spec: "0.1.0",
    description: "VendChain machine registry and sales tracking",
  },
  instructions: [
    {
      name: "initialize_registry",
      discriminator: discriminator("global:initialize_registry"),
      accounts: [
        { name: "authority", writable: true, signer: true },
        { name: "registry", writable: true, pda: { seeds: [{ kind: "const", value: Array.from(Buffer.from("machine_registry")) }] } },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [],
    },
    {
      name: "register_machine",
      discriminator: discriminator("global:register_machine"),
      accounts: [
        { name: "owner", writable: true, signer: true },
        { name: "registry", writable: true, pda: { seeds: [{ kind: "const", value: Array.from(Buffer.from("machine_registry")) }] } },
        {
          name: "machine",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: Array.from(Buffer.from("machine")) },
              { kind: "arg", path: "machine_id" },
            ],
          },
        },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "machine_id", type: { array: ["u8", 16] } },
        { name: "location", type: { array: ["u8", 64] } },
      ],
    },
    {
      name: "record_sale",
      discriminator: discriminator("global:record_sale"),
      accounts: [
        { name: "buyer", signer: true },
        { name: "registry", writable: true, pda: { seeds: [{ kind: "const", value: Array.from(Buffer.from("machine_registry")) }] } },
        {
          name: "machine",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: Array.from(Buffer.from("machine")) },
              { kind: "account", path: "machine.machine_id" },
            ],
          },
        },
      ],
      args: [
        { name: "amount_lamports", type: "u64" },
      ],
    },
    {
      name: "toggle_machine",
      discriminator: discriminator("global:toggle_machine"),
      accounts: [
        { name: "owner", writable: true, signer: true },
        {
          name: "machine",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: Array.from(Buffer.from("machine")) },
              { kind: "account", path: "machine.machine_id" },
            ],
          },
        },
      ],
      args: [
        { name: "is_active", type: "bool" },
      ],
    },
  ],
  accounts: [
    {
      name: "MachineRegistry",
      discriminator: discriminator("account:MachineRegistry"),
    },
    {
      name: "MachineAccount",
      discriminator: discriminator("account:MachineAccount"),
    },
  ],
  events: [
    {
      name: "SaleEvent",
      discriminator: discriminator("event:SaleEvent"),
    },
  ],
  errors: [
    { code: 6000, name: "InvalidMachineId", msg: "Machine ID must be 1-16 ASCII characters" },
    { code: 6001, name: "InvalidLocation", msg: "Location must be 1-64 bytes" },
    { code: 6002, name: "MachineNotActive", msg: "Machine is not active" },
    { code: 6003, name: "ZeroAmount", msg: "Sale amount must be greater than zero" },
    { code: 6004, name: "Unauthorized", msg: "Only machine owner can perform this action" },
    { code: 6005, name: "Overflow", msg: "Math overflow" },
  ],
  types: [
    {
      name: "MachineRegistry",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "total_machines", type: "u64" },
          { name: "total_revenue", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "MachineAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "machine_id", type: { array: ["u8", 16] } },
          { name: "location", type: { array: ["u8", 64] } },
          { name: "total_revenue", type: "u64" },
          { name: "total_sales", type: "u64" },
          { name: "is_active", type: "bool" },
          { name: "registered_at", type: "i64" },
          { name: "last_sale_at", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "SaleEvent",
      type: {
        kind: "struct",
        fields: [
          { name: "machine_id", type: { array: ["u8", 16] } },
          { name: "buyer", type: "pubkey" },
          { name: "amount_lamports", type: "u64" },
          { name: "timestamp", type: "i64" },
        ],
      },
    },
  ],
};

const out = path.join(process.cwd(), "lib/idl/vend_machine.json");
fs.writeFileSync(out, JSON.stringify(idl, null, 2));
console.log("Written:", out);
console.log("\nDiscriminators:");
for (const ix of idl.instructions) {
  console.log(`  ${ix.name}: [${ix.discriminator.join(",")}]`);
}
for (const acc of idl.accounts) {
  console.log(`  ${acc.name}: [${acc.discriminator.join(",")}]`);
}
