/**
 * Шаг 3: Инициализировать реестр машин и зарегистрировать машины on-chain
 * Запуск: npx tsx scripts/setup-machines.ts
 */
import {
  Connection, Keypair, PublicKey, sendAndConfirmTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const RPC_URL    = "https://devnet.helius-rpc.com/?api-key=3d77b912-770c-433e-b920-1dac2f9efc39";
const PROGRAM_ID = new PublicKey("Ewcmz7Bvxm74hGB8op7j1jVTmP8QKyRAe82BoWMWAeke");

// Машины для регистрации
const MACHINES = [
  { id: "VC-9928", name: "Shibuya Crossing",    location: "Tokyo, JP"      },
  { id: "VC-1042", name: "Central Park",         location: "New York, US"   },
  { id: "VC-8831", name: "Silicon Roundabout",   location: "London, GB"     },
  { id: "VC-2210", name: "Marina Bay",           location: "Singapore, SG"  },
  { id: "VC-5501", name: "Almaty Plaza",         location: "Almaty, KZ"     },
  { id: "VC-3317", name: "DIFC Tower",           location: "Dubai, AE"      },
];

function strToBytes(s: string, len: number): number[] {
  const buf = Buffer.alloc(len, 0);
  Buffer.from(s, "utf8").copy(buf, 0, 0, len);
  return Array.from(buf);
}

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");

  const keypairPaths = ["C:/solana/id.json", `${process.env.HOME}/.config/solana/id.json`];
  let payer: Keypair | null = null;
  for (const p of keypairPaths) {
    if (fs.existsSync(p)) {
      payer = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
      break;
    }
  }
  if (!payer) throw new Error("Keypair not found");
  console.log("Deployer:", payer.publicKey.toBase58());
  console.log("Balance:", (await conn.getBalance(payer.publicKey)) / 1e9, "SOL\n");

  const idlPath = path.join(process.cwd(), "lib/idl/vend_machine.json");
  if (!fs.existsSync(idlPath)) throw new Error("IDL not found: lib/idl/vend_machine.json — дождись завершения CI");
  const IDL = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(conn, wallet, { commitment: "confirmed" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = new Program(IDL as any, provider);

  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("machine_registry")], PROGRAM_ID
  );
  console.log("Registry PDA:", registryPda.toBase58());

  // ── Шаг 1: Инициализировать реестр (если ещё не создан) ──────────
  const existing = await conn.getAccountInfo(registryPda);
  if (existing) {
    console.log("✅ Registry already exists, skipping init.\n");
  } else {
    console.log("Initializing registry...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await (program.methods as any).initializeRegistry()
      .accounts({ authority: payer.publicKey, registry: registryPda })
      .rpc();
    console.log("✅ Registry initialized:", sig, "\n");
  }

  // ── Шаг 2: Регистрируем машины ────────────────────────────────────
  for (const m of MACHINES) {
    const machineIdBytes = strToBytes(m.id, 16);
    const [machinePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("machine"), Buffer.from(machineIdBytes)], PROGRAM_ID
    );

    const machineAcc = await conn.getAccountInfo(machinePda);
    if (machineAcc) {
      console.log(`⏭  ${m.id} already registered (${machinePda.toBase58()})`);
      continue;
    }

    console.log(`Registering ${m.id} — ${m.name}...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await (program.methods as any)
      .registerMachine(
        machineIdBytes,
        strToBytes(m.name, 32),
        strToBytes(m.location, 64),
      )
      .accounts({
        owner: payer.publicKey,
        registry: registryPda,
        machine: machinePda,
      })
      .rpc();
    console.log(`✅ ${m.id} registered: ${sig}`);
  }

  console.log("\n✅ All machines registered!");
  console.log("Registry PDA:", registryPda.toBase58());
}

main().catch(console.error);
