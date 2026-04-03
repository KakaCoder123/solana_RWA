'use client'

import { useEffect, useState } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { supabase } from '../lib/supabase'
import IDL from '../lib/idl/vend_machine.json'

const RPC_URL    = process.env.NEXT_PUBLIC_RPC_URL!
const PROGRAM_ID = new PublicKey('Ewcmz7Bvxm74hGB8op7j1jVTmP8QKyRAe82BoWMWAeke')

export type MachineStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'

export interface Machine {
  id: string
  name: string
  location: string
  status: MachineStatus
  totalRevenue: number   // lamports on-chain
  totalSales: number
  // Supabase поля
  dailyAvg: number
  today: number
  uptime: number
  weekRevenue: number[]
  topProducts: { name: string; revenue: number }[]
  imageUrl: string | null
}

const STATUS_MAP: MachineStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE']

function decodeStr(bytes: number[]): string {
  const end = bytes.findIndex(b => b === 0)
  return Buffer.from(end === -1 ? bytes : bytes.slice(0, end)).toString('utf8')
}

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        // 1. Читаем все машины on-chain
        const conn = new Connection(RPC_URL, 'confirmed')
        const provider = new AnchorProvider(
          conn,
          { publicKey: PublicKey.default, signTransaction: async t => t, signAllTransactions: async t => t },
          { commitment: 'confirmed' }
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const program = new Program(IDL as any, provider)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onChainAccounts = await (program.account as any).machineAccount.all()

        // 2. Читаем метаданные из Supabase
        const { data: meta } = await supabase.from('machines').select('*')
        const metaMap = new Map((meta ?? []).map((m: any) => [m.machine_id, m]))

        // 3. Объединяем
        const result: Machine[] = onChainAccounts.map((acc: any) => {
          const a = acc.account
          const machineId = decodeStr(Array.from(a.machineId))
          const m = metaMap.get(machineId)

          return {
            id: machineId,
            name: decodeStr(Array.from(a.name)),
            location: decodeStr(Array.from(a.location)),
            status: STATUS_MAP[a.status] ?? 'OFFLINE',
            totalRevenue: a.totalRevenue.toNumber(),
            totalSales: a.totalSales.toNumber(),
            dailyAvg:     m?.daily_avg     ?? 0,
            today:        m?.today         ?? 0,
            uptime:       m?.uptime        ?? 99.9,
            weekRevenue:  m?.week_revenue  ?? [0,0,0,0,0,0,0],
            topProducts:  m?.top_products  ?? [],
            imageUrl:     m?.image_url     ?? null,
          }
        })

        // Сортируем: ONLINE первые
        result.sort((a, b) => {
          const order = { ONLINE: 0, MAINTENANCE: 1, OFFLINE: 2 }
          return order[a.status] - order[b.status]
        })

        setMachines(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load machines')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { machines, loading, error }
}
