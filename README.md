<div align="center">

<br />

# Dimensity

### Talk to your crypto. Execute on-chain.

[![Node.js](https://img.shields.io/badge/Node.js-≥18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-4-000000?style=flat-square&logo=vercel&logoColor=white)](https://sdk.vercel.ai)
[![viem](https://img.shields.io/badge/viem-2.x-1E1E20?style=flat-square)](https://viem.sh)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**An autonomous AI agent that replaces dApp UIs with natural language.**
**Connect your wallet. Type what you want. Watch it execute.**

[Live Demo →](https://dimensity.vercel.app) · [Report Bug](https://github.com/Hitman350/dimensity/issues) · [Request Feature](https://github.com/Hitman350/dimensity/issues)

<br />

</div>

---

## The Problem

Interacting with blockchain today means:
- Navigating **dozens of dApp interfaces** just to send tokens, deploy contracts, or check balances
- **Copy-pasting** hex addresses and manually decoding transaction data
- Having **zero safety checks** before signing — you hope you read the calldata right
- **No memory** — every session starts from scratch, no contacts, no context

## The Solution

Dimensity turns all of that into a single conversation. You talk. It executes.

```
You:   "Send 0.05 ETH to Alice"
Agent:  Resolved Alice → 0x123...abc
        Gas estimate: 0.000042 ETH. Confirm?
        [User clicks Confirm]
Agent:  ✅ Sent! Tx: 0xdef...789
        Save Alice as a contact?
```

Under the hood, a **recursive tool-calling agent loop** built on the Vercel AI SDK connects multi-provider LLM intelligence to the viem blockchain client. Every transaction is simulated before broadcast. Every wallet interaction requires cryptographic proof of ownership.

> **While tools like Zapper and DeBank just *show* you data, Dimensity *explains* it and *acts* on it** — turning blockchain interaction into a guided conversation.

---

## ✨ Feature Highlights

<table>
<tr>
<td width="50%">

### 🔐 Authentication & Identity
- **SIWE Login** — prove wallet ownership via cryptographic signature. No emails, no passwords
- **Multi-Wallet** — add multiple wallets, switch active context seamlessly
- **Contact Book** — save address→nickname mappings for natural language sending
- **Session Memory** — remembers `lastRecipient` and `lastAmount` for follow-ups

</td>
<td width="50%">

### ⚡ Transaction Execution
- **Send ETH** — signs and broadcasts native transfers with pre-flight gas estimation
- **Deploy ERC-20** — deploys tokens with name, symbol, and supply via compiled bytecode
- **Gas Estimation** — shows precise gas costs in ETH before confirmation
- **Client Confirmation** — every write operation halts for explicit user approval

</td>
</tr>
<tr>
<td width="50%">

### 🔍 Analysis & Intelligence
- **Explain Transaction** — decodes any tx hash into plain-English
- **Contract Scanner** — analyzes bytecode for dangerous selectors (`mint`, `blacklist`, `pause`, `selfdestruct`)
- **Token Info** — reads `name`, `symbol`, `decimals`, `totalSupply` from any ERC-20
- **Live ETH Price** — real-time USD/EUR via CoinGecko with 60s cache

</td>
<td width="50%">

### 🤖 Provider-Agnostic LLM
- **Gemini** (default) — `gemini-2.5-flash`
- **OpenAI** — `gpt-4o`
- **Anthropic** — `claude-sonnet-4-20250514`
- Swap engines with one env var. All tool execution stays untouched.

</td>
</tr>
</table>

---

## 🔒 6-Layer Security Model

Dimensity implements defense-in-depth across every interaction surface. No single point of failure.

```mermaid
graph TB
    subgraph "Layer 1: SIWE Authentication"
        A["Cryptographic wallet signature<br/>No passwords — prove you own the key"]
    end
    subgraph "Layer 2: Replay Protection"
        B["Server-generated nonce<br/>5-minute expiry · single-use enforcement"]
    end
    subgraph "Layer 3: Session Isolation"
        C["JWT-only sessions (7-day expiry)<br/>No server-side session storage"]
    end
    subgraph "Layer 4: Wallet Deletion Guard"
        D["Re-SIWE required to remove wallet<br/>Must re-prove ownership before deletion"]
    end
    subgraph "Layer 5: Key Isolation"
        E["LLM never touches private keys<br/>Structured intent only — no raw calldata"]
    end
    subgraph "Layer 6: Write Safety"
        F["Every state-changing op requires<br/>explicit user confirmation via modal"]
    end

    A --> B --> C --> D --> E --> F

    style A fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style B fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style C fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style D fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style E fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style F fill:#1a1a2e,stroke:#8B5CF6,color:#fff
```

| Layer | Mechanism | Implementation |
|:------|:----------|:---------------|
| **1. Authentication** | SIWE — cryptographic proof of wallet ownership | `viem.verifyMessage()` in `auth.ts` |
| **2. Replay Protection** | Server-generated nonce with 5-minute expiry | `Nonce` model — single-use, DB-enforced |
| **3. Session Isolation** | JWT-only (7-day expiry), no server-side sessions | NextAuth v5 `strategy: "jwt"` |
| **4. Wallet Deletion** | Requires re-SIWE — must prove ownership of the wallet being removed | Re-authentication gate on delete |
| **5. Key Isolation** | LLM never touches private keys or raw calldata | Signer abstraction — structured intent only |
| **6. Write Safety** | Every state-changing operation requires explicit user confirmation | `ConfirmationModal` intercepts all write tool calls |

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────┐
│              LLM Provider Layer                  │
│     Gemini  ·  OpenAI  ·  Anthropic  (adapters)  │
└───────────────────┬──────────────────────────────┘
                    │  Vercel AI SDK (streamText)
┌───────────────────▼──────────────────────────────┐
│          Agent Loop  (Next.js API Route)         │
│   Recursive · Concurrent · maxSteps: 10          │
│   Per-request auth · Dynamic system prompt       │
└───────────────────┬──────────────────────────────┘
                    │  CoreTool interface (Zod validated)
┌───────────────────▼──────────────────────────────┐
│            Tool Execution Layer                  │
│    17 tools  ·  inline registry  ·  zod schemas  │
│    Read tools → auto-execute                     │
│    Write tools → ConfirmationModal               │
└───────────────────┬──────────────────────────────┘
                    │  Signer interface
┌───────────────────▼──────────────────────────────┐
│              Signer Layer                        │
│   LocalSigner  ·  KernelSigner (AA-ready)        │
└───────────────────┬──────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────┐
│        Abstract Testnet  (zkSync L2)             │
└──────────────────────────────────────────────────┘
```

### Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Next.js Chat UI
    participant API as /api/chat
    participant LLM as Gemini / OpenAI / Anthropic
    participant Tools as Tool Registry (17 tools)
    participant Chain as Abstract Testnet (zkSync L2)

    U->>UI: "Send 0.05 ETH to Alice"
    UI->>API: POST messages + session JWT
    API->>API: Validate JWT · load active wallet
    API->>LLM: streamText (system prompt + wallet context)
    LLM-->>API: tool_call: resolve_contact("Alice")
    API->>Tools: auto-execute (read tool)
    Tools-->>API: 0x123...abc
    API->>LLM: tool result appended → recurse
    LLM-->>API: tool_call: send_transaction(0x123...abc, 0.05)
    API-->>UI: pending tool call (no execute — write tool)
    UI->>U: ConfirmationModal: "Send 0.05 ETH?"
    U->>UI: Clicks Confirm
    UI->>API: POST /api/execute-tool (authenticated)
    API->>Chain: broadcast signed transaction
    Chain-->>API: tx receipt
    API-->>UI: "✅ Sent! Tx: 0xdef..."
```

### Read vs. Write Tool Execution

```mermaid
flowchart LR
    LLM["LLM generates<br/>tool_call"] --> CHECK{Has execute<br/>function?}
    CHECK -->|"Yes (Read Tool)"| AUTO["Auto-execute<br/>server-side"]
    CHECK -->|"No (Write Tool)"| MODAL["Return to client<br/>→ ConfirmationModal"]
    MODAL --> USER{User decision}
    USER -->|Confirm| EXEC["POST /api/execute-tool<br/>(authenticated)"]
    USER -->|Cancel| CANCEL["Tool result: 'cancelled'"]
    AUTO --> RESULT["Result → LLM<br/>for next step"]
    EXEC --> RESULT

    style LLM fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style CHECK fill:#1a1a2e,stroke:#F59E0B,color:#fff
    style AUTO fill:#1a1a2e,stroke:#10B981,color:#fff
    style MODAL fill:#1a1a2e,stroke:#EF4444,color:#fff
    style EXEC fill:#1a1a2e,stroke:#10B981,color:#fff
```

---

## 🛠️ 17 Registered Tools

<details>
<summary><b>Click to view the complete tool registry</b></summary>

| # | Tool | Type | Description |
|:--|:-----|:-----|:------------|
| 1 | `get_balance` | Read | Fetch native ETH balance for any wallet address |
| 2 | `get_wallet_address` | Read | Return the currently active wallet address |
| 3 | `send_transaction` | **Write** | Transfer ETH (requires client confirmation) |
| 4 | `deploy_erc20` | **Write** | Deploy an ERC-20 token contract (requires confirmation) |
| 5 | `explain_transaction` | Read | Decode a transaction hash into human-readable summary |
| 6 | `scan_contract` | Read | Analyze contract bytecode for risky function selectors |
| 7 | `get_token_info` | Read | Read ERC-20 metadata (name, symbol, decimals, supply) |
| 8 | `estimate_gas` | Read | Estimate gas cost for a transaction in ETH |
| 9 | `get_wallet_history` | Read | Fetch recent transactions from Blockscout API |
| 10 | `get_eth_price` | Read | Fetch live ETH/USD and ETH/EUR prices (60s cache) |
| 11 | `list_wallets` | Read | List all wallets for the authenticated user |
| 12 | `switch_wallet` | Read | Switch the active wallet (atomic DB transaction) |
| 13 | `rename_wallet` | Read | Update a wallet's nickname |
| 14 | `add_contact` | Read | Save an address → nickname mapping |
| 15 | `resolve_contact` | Read | Look up an address by contact nickname |
| 16 | `get_contacts` | Read | List all saved contacts |
| 17 | `remove_contact` | Read | Delete a contact entry |

> **Read tools** include an `execute` function and run server-side automatically.
> **Write tools** omit `execute`, causing the AI SDK to return them to the client for user confirmation via `ConfirmationModal`.

</details>

---

## 💬 Usage Examples

<table>
<tr><td>

**Portfolio Check**
```
You:  What's my balance?
Bot:  Your balance is 0.145 ETH (~$362.50 USD).
```

</td><td>

**Send ETH**
```
You:  Send 0.05 ETH to 0x123...abc
Bot:  Gas estimate: 0.000042 ETH. Confirm?
      [User clicks Confirm]
Bot:  ✅ Sent! Tx: 0xdef...789
```

</td></tr>
<tr><td>

**Contact Book**
```
You:  Save that address as Alice
Bot:  ✅ Saved "Alice" → 0x123...abc
You:  Send her another 0.02
Bot:  Preparing 0.02 ETH → Alice. Confirm?
```

</td><td>

**Security Scan**
```
You:  Is 0xabc...123 safe?
Bot:  ⚠️ High risk detected:
      • transferOwnership(address)
      • pause() — owner can freeze
      • mint(address, uint256)
```

</td></tr>
</table>

---

## 📁 Project Structure

```
dimensity/
├── src/                          # Standalone CLI agent (TypeScript)
│   ├── agent/                    # Agent loop & prompt engine
│   ├── providers/                # LLM adapters (Gemini, OpenAI, Claude)
│   ├── signers/                  # LocalSigner, KernelSigner (AA-ready)
│   └── tools/                    # 11 CLI tool implementations
│
├── web/                          # Next.js 15 full-stack web app
│   ├── app/
│   │   ├── page.tsx              # Auth gate → ConnectWallet / ChatInterface
│   │   ├── globals.css           # Design system (CSS custom properties)
│   │   └── api/
│   │       ├── chat/route.ts     # Agent loop: 17 tools, per-request auth
│   │       ├── execute-tool/     # Server-side execution after confirmation
│   │       ├── auth/             # SIWE nonce + verify + NextAuth handler
│   │       └── wallets/          # Wallet CRUD (add, switch, rename, delete)
│   ├── components/
│   │   ├── ChatInterface.tsx     # useChat hook, streaming, scroll logic
│   │   ├── ConfirmationModal.tsx # Pre-flight approval for write operations
│   │   ├── ConnectWallet.tsx     # SIWE MetaMask connection flow
│   │   ├── Header.tsx            # Wallet switcher + sign out
│   │   ├── MessageBubble.tsx     # Rich message rendering + inline tools
│   │   └── SessionProvider.tsx   # NextAuth session wrapper
│   ├── lib/
│   │   ├── auth.ts               # NextAuth v5 config + SIWE + viem verify
│   │   ├── clients.ts            # Shared viem public client
│   │   ├── prisma.ts             # Singleton PrismaClient
│   │   └── system-prompt.ts      # LLM persona + wallet/contact rules
│   └── prisma/
│       └── schema.prisma         # User, Wallet, Contact, Nonce models
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Source |
|:------------|:-------|
| Node.js ≥ 18 | [nodejs.org](https://nodejs.org) |
| MetaMask | [metamask.io](https://metamask.io) |
| Gemini API Key | [Google AI Studio](https://aistudio.google.com/) |
| Supabase Project | [supabase.com](https://supabase.com) (free tier) |
| Testnet ETH | [Abstract Faucet](https://faucet.abs.xyz) |

### 1. Clone & Install

```bash
git clone https://github.com/Hitman350/dimensity.git
cd dimensity/web
npm install
```

### 2. Configure Environment

Create `web/.env.local`:

```env
# LLM Provider (default: Gemini)
GEMINI_API_KEY=your_gemini_key

# Signer (development — DO NOT use mainnet keys)
PRIVATE_KEY=0x_your_testnet_private_key

# Database (Supabase Postgres — use pooler URL)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:5432/postgres

# Auth
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

### 3. Initialize Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run

```bash
npm run dev
```

Open `http://localhost:3000` → Connect MetaMask → Start chatting.

---

## 🔀 Switching LLM Providers

Dimensity is **provider-agnostic**. Swap intelligence engines with one env var:

| Provider | Env Var | Default Model |
|:---------|:--------|:--------------|
| **Google** (default) | `GEMINI_API_KEY` | `gemini-2.5-flash` |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` |
| **Anthropic** | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

All tool execution, streaming, and confirmation logic remains untouched.

---

## 🧩 Adding a New Tool

Tools are registered inline in `web/app/api/chat/route.ts` using the Vercel AI SDK's `tool()` function:

```typescript
// Inside buildTools() in chat/route.ts
get_network_status: tool({
    description: "Get current block number and gas price on Abstract Testnet.",
    parameters: z.object({}),
    execute: async () => {
        const [block, gasPrice] = await Promise.all([
            publicClient.getBlockNumber(),
            publicClient.getGasPrice(),
        ]);
        return JSON.stringify({
            block: block.toString(),
            gas_gwei: (Number(gasPrice) / 1e9).toFixed(4),
        });
    },
}),
```

- **Read tools**: Include `execute` → auto-dispatched by the agent
- **Write tools**: Omit `execute` → intercepted by `<ConfirmationModal />` for user approval

No other code changes required. The agent loop auto-discovers registered tools.

---

## 🎯 Design Decisions

| Decision | Choice | Rationale |
|:---------|:-------|:----------|
| **Provider-agnostic LLM** | Vercel AI SDK adapters | No vendor lock-in. Switch Gemini → GPT-4o with one env var |
| **Signer abstraction** | `LocalSigner` / `KernelSigner` | LLM outputs intent, never touches cryptography |
| **SIWE over Passkeys** | Existing MetaMask wallets | Target audience is crypto-native — no identity fragmentation |
| **Blockscout over Alchemy** | REST API at `explorer.testnet.abs.xyz` | Free, fast, and indexes Abstract Testnet properly |
| **Vanilla CSS over Tailwind** | CSS custom properties design system | Full control over design tokens, no build dependency |
| **No conversation DB** | React `useChat` state | Simple. Persistence adds complexity with no immediate ROI |

---

## ⚠️ Limitations

- **Not fully autonomous** — responds to user prompts, does not run background jobs
- **Predefined tool set** — the LLM cannot write or execute arbitrary code
- **Testnet only** — operates exclusively on Abstract Testnet
- **Server-side signing** — development uses `.env` private key; production requires client-side MetaMask signing
- **Requires MetaMask** — no embedded wallet fallback yet
- **Ephemeral conversations** — history clears on page refresh
- **Single active wallet** — AI views balances for the active wallet only

---

## 🗺️ Roadmap

| Phase | Status | Description |
|:------|:-------|:------------|
| **Phase 1** | ✅ Complete | AI SDK integration, streaming chat, 10 blockchain tools, confirmation modal |
| **Phase 2** | ✅ Complete | SIWE auth, multi-wallet, contact book, per-request signer |
| **Phase 3** | 🔄 Planned | Proactive approval scanning, full tx simulation UI, client-side MetaMask signing |
| **Phase 4** | 🔮 Future | Multi-chain (Arbitrum, Base), Passkey auth via ZeroDev, conversation persistence |

---

## 🌐 Network Details

| Property | Value |
|:---------|:------|
| **Chain** | Abstract Testnet |
| **Type** | zkSync-based Layer 2 Rollup |
| **Chain ID** | 11124 |
| **EIP-712** | Required for all typed transactions |
| **Faucet** | [faucet.abs.xyz](https://faucet.abs.xyz) |
| **Explorer** | [explorer.testnet.abs.xyz](https://explorer.testnet.abs.xyz) |

---

## 🛠️ Tech Stack

| Technology | Role |
|:-----------|:-----|
| **Next.js 15** | Full-stack App Router framework |
| **Vercel AI SDK 4** | Streaming LLM orchestration with tool calling |
| **viem 2** | Type-safe blockchain client with zkSync extensions |
| **siwe** | Sign-In with Ethereum authentication |
| **NextAuth.js v5** | JWT session management |
| **Prisma 6** | Type-safe ORM for PostgreSQL |
| **Supabase** | Managed PostgreSQL database |
| **Zod** | Runtime schema validation for tool parameters |
| **React 19** | UI rendering engine |

---

<div align="center">

## 📄 License

MIT © [Hitman350](https://github.com/Hitman350)

<br />

**If Dimensity helped you, consider giving it a ⭐**

</div>
