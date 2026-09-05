import "server-only"
import { getSetting } from "@/lib/auth/store"

export type ChainId = "ethereum" | "bsc" | "polygon"

type ChainInfo = {
  label: string
  rpc: string[]
  nativeSymbol: string
  nativeCoinId: string
  nativeDecimals: number
  etherscanChainId?: number
}

export const CHAINS: Record<ChainId, ChainInfo> = {
  ethereum: {
    label: "Ethereum",
    rpc: ["https://ethereum-rpc.publicnode.com", "https://rpc.flashbots.net"],
    nativeSymbol: "ETH",
    nativeCoinId: "ethereum",
    nativeDecimals: 18,
    etherscanChainId: 1,
  },
  bsc: {
    label: "BNB Chain",
    rpc: ["https://bsc-rpc.publicnode.com", "https://bsc-dataseed.binance.org"],
    nativeSymbol: "BNB",
    nativeCoinId: "binancecoin",
    nativeDecimals: 18,
  },
  polygon: {
    label: "Polygon",
    rpc: ["https://polygon-bor-rpc.publicnode.com"],
    nativeSymbol: "POL",
    nativeCoinId: "matic-network",
    nativeDecimals: 18,
  },
}

export function isSupportedChain(chain: string): chain is ChainId {
  return chain in CHAINS
}

export function isAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}

async function rpcCall<T>(chain: ChainId, method: string, params: unknown[]): Promise<T> {
  let lastError: Error | null = null

  for (const url of CHAINS[chain].rpc) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(12000),
      })
      const text = await res.text()
      const data = JSON.parse(text) as { result?: T; error?: { message: string } }
      if (data.error) throw new Error(data.error.message)
      if (data.result === undefined) throw new Error("bos yanit")
      return data.result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("bilinmeyen hata")
    }
  }

  throw lastError ?? new Error("RPC erisilemedi")
}

function hexToBigInt(value: string) {
  return BigInt(value === "0x" ? "0x0" : value)
}

export function formatUnits(raw: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const fraction = raw % base
  if (fraction === 0n) return whole.toString()
  const digits = fraction.toString().padStart(decimals, "0").replace(/0+$/, "")
  return `${whole}.${digits.slice(0, 8)}`
}

export async function nativeBalance(chain: ChainId, address: string) {
  try {
    const hex = await rpcCall<string>(chain, "eth_getBalance", [address, "latest"])
    return formatUnits(hexToBigInt(hex), CHAINS[chain].nativeDecimals)
  } catch (error) {
    if (chain === "ethereum") {
      const fallback = await etherscanNative(address)
      if (fallback !== null) return fallback
    }
    throw error
  }
}

async function etherscanNative(address: string) {
  const sealed = await getSetting("etherscan_api_key")
  if (!sealed) return null
  try {
    const { open } = await import("@/lib/auth/secret-box")
    const key = open(sealed)
    const res = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${key}`,
      { signal: AbortSignal.timeout(12000) },
    )
    const data = (await res.json()) as { status?: string; result?: string }
    if (data.status !== "1" || !data.result) return null
    return formatUnits(BigInt(data.result), 18)
  } catch {
    return null
  }
}

function decodeString(hex: string) {
  const body = hex.slice(2)
  if (body.length === 64) {
    const bytes = Buffer.from(body, "hex")
    return bytes.toString("utf8").replace(/\0+$/, "").trim()
  }
  const length = Number.parseInt(body.slice(64, 128), 16)
  if (!Number.isFinite(length) || length === 0) return ""
  return Buffer.from(body.slice(128, 128 + length * 2), "hex").toString("utf8")
}

export async function tokenBalance(chain: ChainId, contract: string, address: string, decimals: number) {
  const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`
  const hex = await rpcCall<string>(chain, "eth_call", [{ to: contract, data }, "latest"])
  return formatUnits(hexToBigInt(hex), decimals)
}

export async function tokenMetadata(chain: ChainId, contract: string) {
  const [symbolHex, decimalsHex] = await Promise.all([
    rpcCall<string>(chain, "eth_call", [{ to: contract, data: "0x95d89b41" }, "latest"]),
    rpcCall<string>(chain, "eth_call", [{ to: contract, data: "0x313ce567" }, "latest"]),
  ])
  const symbol = decodeString(symbolHex).replace(/[^\w.$-]/g, "").slice(0, 12)
  const decimals = Number(hexToBigInt(decimalsHex))
  if (!symbol || !Number.isFinite(decimals) || decimals > 36) throw new Error("Token bilgisi okunamadi")
  return { symbol, decimals }
}
