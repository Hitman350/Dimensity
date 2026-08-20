<div align="center">

<br />

# Dimensity

### Talk to your crypto. Execute on-chain.

[![Node.js](https://img.shields.io/badge/Node.js-≥20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![ZeroDev](https://img.shields.io/badge/ZeroDev-Kernel_v3.1-7C3AED?style=flat-square)](https://zerodev.app)
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052FF?style=flat-square&logo=coinbase&logoColor=white)](https://base.org)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-4-000000?style=flat-square&logo=vercel&logoColor=white)](https://sdk.vercel.ai)
[![viem](https://img.shields.io/badge/viem-2.x-1E1E20?style=flat-square)](https://viem.sh)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**An autonomous AI agent that replaces dApp UIs with natural language.**
**Connect your wallet. Type what you want. Watch it execute.**

[What it does](#-what-you-can-do) · [Agent Mode](#-agent-mode) · [Security](#-security-model) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Tools](#-registered-tools) · [License](#-license)

<br />

</div>

---

## The Problem

Interacting with a chain today often means:

- Jumping between **many dApp UIs** for transfers, deploys, and balance checks
- **Copy-pasting** hex addresses and guessing what transaction data does
- **Approving every popup** — MetaMask fatigue on routine operations
- **No continuity** — little shared context between sessions (contacts, history, intent)

## The Solution

Dimensity turns that into **one chat**. You describe intent in plain language; a **tool-calling agent** (Vercel AI SDK + viem) plans steps, runs read operations automatically, and pauses **writes** until you confirm — or handles them autonomously with **Agent Mode**.

```
You:   "Send 0.05 ETH to Alice"
Agent: Resolved Alice → 0x123...abc
       Sending 0.05 ETH to Alice. Confirm?
       [User clicks Confirm]
Agent: ✅ Sent! Tx: 0xdef...789
       Save Alice as a contact?
```

With **Agent Mode** enabled, the agent signs and submits transactions in the background using a ZeroDev session key — no MetaMask popups, no interruptions:

```
You:   "Send 0.01 ETH to Alice"
Agent: ✅ Sent autonomously via session key.
       Tx: 0xabc...456
```

---

## 🎯 What you can do

| Area | Examples |
|:-----|:---------|
| **Money movement** | Send native ETH; use **saved contacts** so you can say "pay Alice" instead of pasting `0x…` |
| **Wallets & identity** | Register **multiple wallets**, switch the active one, rename them — the model uses your **active wallet** for balances and sends |
| **Portfolio & activity** | Check balance, recent **transaction history** (via BaseScan API), and **ETH price** in USD/EUR |
| **Tokens** | Read **ERC-20 metadata** (name, symbol, decimals, supply); **deploy** a standard ERC-20 with name, symbol, and initial supply |
| **Safety & understanding** | **Explain** any tx hash in plain language; **scan** contract bytecode for risky patterns (mint, pause, blacklist, ownership); the agent **refuses high-risk interactions** |
| **Agent Mode** | Enable **autonomous execution** via ZeroDev session keys — transactions execute without MetaMask popups, subject to spending limits and 24h expiry |
| **Continuity** | **Persistent chats** with sidebar history, auto-titled threads, searchable conversations |

---

## 🤖 Agent Mode

Agent Mode enables **zero-popup autonomous transactions** using [ZeroDev](https://zerodev.app) smart account infrastructure (Kernel v3.1, EntryPoint v0.7).

### How It Works

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant Backend as NestJS API
    participant ZD as ZeroDev Bundler
    participant Chain as Base Sepolia

    Note over User,UI: One-time setup
    User->>UI: Enable Agent Mode
    UI->>UI: Generate ephemeral session key
    UI->>UI: Create permission validator (policies)
    UI->>User: MetaMask: sign enable signature
    UI->>Backend: Store encrypted key + serialized permission

    Note over User,Chain: Autonomous execution
    User->>UI: "Send 0.01 ETH to Alice"
    UI->>Backend: POST /api/chat
    Backend->>Backend: Spending limit check (0.01 ETH/tx, 0.1 ETH/24h)
    Backend->>Backend: Decrypt session key, deserialize permission
    Backend->>ZD: Submit UserOperation (gas sponsored)
    ZD->>Chain: Execute on-chain
    Chain-->>UI: ✅ Tx confirmed
```

### Dual Execution Paths

| | Manual Mode (default) | Agent Mode |
|:--|:--|:--|
| **Auth** | MetaMask signs each tx | Session key signs autonomously |
| **UX** | Confirmation modal per write | Zero popups |
| **Limits** | User-controlled | 0.01 ETH/tx, 0.1 ETH/24h cumulative |
| **Expiry** | N/A | 24-hour on-chain + DB enforcement |
| **Gas** | Sponsored by ZeroDev paymaster | Sponsored by ZeroDev paymaster |

### Session Lifecycle

1. **Prepare** — Backend generates an ephemeral private key, encrypts it (AES-256-CBC), caches the public address
2. **Authorize** — Frontend creates a `PermissionValidator` with policies, owner signs via MetaMask, serialized permission sent to backend
3. **Execute** — Backend decrypts key, deserializes permission account, submits UserOperations via ZeroDev bundler
4. **Revoke** — Encrypted private key is wiped from database, session status set to `REVOKED`

---

## ✨ Feature Highlights

<table>
<tr>
<td width="50%">

### 🔐 Authentication & Identity
- **SIWE Login** — prove wallet ownership via cryptographic signature
- **Multi-Wallet** — add multiple wallets, switch active context seamlessly
- **Contact Book** — save address→nickname mappings for natural language sending
- **Injected context** — each request includes active wallet address and nickname

</td>
<td width="50%">

### ⚡ Transaction Execution
- **Send ETH** — signs and broadcasts native transfers
- **Deploy ERC-20** — deploys tokens with name, symbol, and supply
- **Agent Mode** — autonomous execution via ZeroDev session keys
- **Client Confirmation** — write operations require approval (manual mode)

</td>
</tr>
<tr>
<td width="50%">

### 🔍 Analysis & Intelligence
- **Explain Transaction** — decodes a tx hash into a readable summary
- **Contract Scanner** — analyzes bytecode for risky function selectors
- **Token Info** — reads ERC-20 metadata from any contract
- **Live ETH Price** — USD/EUR via CoinGecko with 60s cache

</td>
<td width="50%">

### 💬 Conversation History
- **Persistent Chats** — conversations stored in PostgreSQL
- **Sidebar Navigation** — browse, search, switch, and delete past chats
- **Auto-Titling** — conversations named from your first message
- **Markdown Rendering** — rich text, lists, tables, and code blocks

</td>
</tr>
<tr>
<td width="50%" colspan="2">

### 🤖 Provider-Agnostic LLM
Swap models with environment variables — **Gemini** (default), **OpenAI** (`gpt-4o`), or **Anthropic** (`claude-sonnet-4-20250514`). Tool wiring stays the same.

</td>
</tr>
</table>

---

## 🔒 Security Model

Dimensity implements defense-in-depth across every interaction surface:

```mermaid
graph LR
    A["🔑 SIWE Auth"] --> B["🔄 Replay Guard"] --> C["🛡️ JWT Sessions"] --> D["🗝️ Key Isolation"] --> E["✋ Write Confirmation"] --> F["📋 Audit Trail"] --> G["💰 Spending Limits"]

    style A fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style B fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style C fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style D fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style E fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style F fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style G fill:#1a1a2e,stroke:#8B5CF6,color:#fff
```

| Layer | What It Does | Implementation |
|:------|:-------------|:---------------|
| **SIWE Auth** | Proves wallet ownership cryptographically | `viem.verifyMessage()` — no passwords |
| **Replay Guard** | Prevents signature reuse | Server nonce, 5-min expiry, single-use, hourly cleanup cron |
| **JWT Sessions** | Stateless auth, no session table for tokens | 7-day expiry, signed tokens via NextAuth v5 |
| **Key Isolation** | LLM never sees private keys | Session keys encrypted with AES-256-CBC; signing in signer layer only |
| **Write Confirmation** | User must approve each write (manual mode) | Confirmation modal before `/api/execute-tool` |
| **Audit Trail** | Every transaction logged | `TransactionLog` table with idempotency keys |
| **Spending Limits** | Agent Mode capped per-tx and daily | 0.01 ETH/tx, 0.1 ETH/24h cumulative; enforced server-side before submission |

### Additional Hardening

| Protection | Implementation |
|:-----------|:---------------|
| **Transaction Idempotency** | Duplicate writes blocked via unique `toolCallId` in `TransactionLog`. Repeat calls return the existing result. |
| **Input Validation** | Global `ValidationPipe` with `class-validator` DTOs + custom `EthereumAddressPipe` (EIP-55 checksums via `viem.isAddress()`). |
| **Rate Limiting** | `@nestjs/throttler` — 3-tier limits (3/sec, 20/10s, 100/min). `helmet` sets security headers. Body capped at 16 KB. |
| **Nonce Cleanup** | `@nestjs/schedule` CRON purges expired/used nonces every hour. |
| **Exception Filter** | `AllExceptionsFilter` returns structured JSON — never leaks stack traces. 500+ errors logged server-side. |
| **Session Key Revocation** | On disable, encrypted private key material is wiped from DB; session status set to `REVOKED`. |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 Frontend                      │
│  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌───────────┐ │
│  │ConnectWlt│ │ChatInterface │ │ AgentMode │ │  Sidebar  │ │
│  │  (SIWE)  │ │+ ConfirmModal│ │ (ZeroDev) │ │ (History) │ │
│  └──────────┘ └──────────────┘ └───────────┘ └───────────┘ │
│  NextAuth /api/auth/*  ·  Agent /api/agent/session/*        │
│  Proxy rewrites → NestJS: /api/chat, /api/execute-tool, etc │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   NestJS 11 Backend   │
              │   Port 4000           │
              │ ┌───────────────────┐ │
              │ │ ChatService       │ │──→ LLM (Gemini / OpenAI / Claude)
              │ │ ExecuteToolService│ │──→ ZeroDev Bundler + Paymaster
              │ │ WalletsController │ │──→ Base Sepolia (viem)
              │ │ SessionGuard      │ │
              │ │ ThrottlerGuard    │ │
              │ └───────────────────┘ │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   PostgreSQL (Prisma) │
              │ Users · Wallets       │
              │ Conversations · Msgs  │
              │ Contacts · Nonces     │
              │ TransactionLogs       │
              │ AgentSessions         │
              └───────────────────────┘
```

### Request Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat UI
    participant API as NestJS API
    participant LLM as LLM Provider
    participant Chain as Base Sepolia

    User->>UI: "Send 0.05 ETH to Alice"
    UI->>API: POST /api/chat + JWT
    API->>API: Auth · load wallet · inject context
    API->>LLM: Stream with tools
    LLM->>API: resolve_contact("Alice")
    API->>API: Auto-execute (read tool)
    API->>LLM: Alice → 0x123...abc
    LLM->>API: send_transaction(0x123, 0.05)
    alt Agent Mode OFF
        API-->>UI: Pending write → needs approval
        UI->>User: "Send 0.05 ETH to Alice?"
        User->>UI: ✅ Confirm
        UI->>API: POST /api/execute-tool
    else Agent Mode ON
        API->>API: Spending limit check
        API->>API: Decrypt session key
    end
    API->>Chain: Submit UserOperation (gas sponsored)
    Chain-->>UI: ✅ Tx confirmed
```

### Read vs Write Tool Execution

```mermaid
flowchart LR
    A["LLM tool call"] --> B{"Agent Mode ON?"}
    B -->|"Yes"| C{"Write tool?"}
    C -->|"Yes"| D["Auto-execute via session key"]
    C -->|"No"| E["Auto-execute (read)"]
    B -->|"No"| F{"Has execute fn?"}
    F -->|"Yes"| E
    F -->|"No"| G["⏸️ Ask user"]
    G --> H{"Approved?"}
    H -->|"Yes"| I["Execute on-chain"]
    H -->|"No"| J["Cancel"]
    D --> K["Result → LLM"]
    E --> K
    I --> K

    style A fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style D fill:#1a1a2e,stroke:#10B981,color:#fff
    style G fill:#1a1a2e,stroke:#EF4444,color:#fff
```

---

## 🛠️ Registered Tools

<details>
<summary><b>Click to view the complete tool registry</b></summary>

| # | Tool | Type | Description |
|:--|:-----|:-----|:------------|
| 1 | `get_balance` | Read | Fetch native ETH balance for any wallet address |
| 2 | `get_wallet_address` | Read | Return the currently active wallet address |
| 3 | `send_transaction` | **Write** | Transfer ETH (confirmation or agent mode) |
| 4 | `deploy_erc20` | **Write** | Deploy an ERC-20 token contract |
| 5 | `explain_transaction` | Read | Decode a transaction hash into human-readable summary |
| 6 | `scan_contract` | Read | Analyze contract bytecode for risky function selectors |
| 7 | `get_token_info` | Read | Read ERC-20 metadata (name, symbol, decimals, supply) |
| 8 | `estimate_gas` | Read | Estimate gas cost for a transaction in ETH |
| 9 | `get_wallet_history` | Read | Fetch recent transactions from BaseScan API |
| 10 | `get_eth_price` | Read | Fetch live ETH/USD and ETH/EUR prices (60s cache) |
| 11 | `list_wallets` | Read | List all wallets for the authenticated user |
| 12 | `switch_wallet` | Read | Switch the active wallet (atomic DB transaction) |
| 13 | `rename_wallet` | Read | Update a wallet's nickname |
| 14 | `add_contact` | Read | Save an address → nickname mapping |
| 15 | `resolve_contact` | Read | Look up an address by contact nickname |
| 16 | `get_contacts` | Read | List all saved contacts |
| 17 | `remove_contact` | Read | Delete a contact entry |

> **Read tools** define an `execute` handler and run server-side during the agent turn.
> **Write tools** omit `execute` in manual mode (client shows ConfirmationModal), or auto-execute via session key in Agent Mode.

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
Bot:  Sending 0.05 ETH to 0x123...abc. Confirm?
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

## 🚀 Quick Start

### Prerequisites

| Requirement | Source |
|:------------|:-------|
| **Docker** & **Docker Compose** | [docker.com](https://docker.com) |
| **Node.js ≥ 20** | [nodejs.org](https://nodejs.org) |
| **MetaMask** | [metamask.io](https://metamask.io) |
| **LLM API Key** (any one) | [Gemini](https://aistudio.google.com/) · [OpenAI](https://platform.openai.com/) · [Anthropic](https://console.anthropic.com/) |
| **ZeroDev Project** (for Agent Mode) | [zerodev.app](https://zerodev.app) |

### 1. Clone & Install

```bash
git clone https://github.com/Hitman350/dimensity.git
cd dimensity
npm install
cd web && npm install && cd ..
```

### 2. Configure Environment

**Root `.env`** (backend):

```env
# ── LLM Provider (pick ONE) ──────────────────────
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# ── Database ─────────────────────────────────────
DATABASE_URL=postgresql://dimensity:localdevonly@localhost:5433/dimensity

# ── Auth ─────────────────────────────────────────
NEXTAUTH_SECRET=<openssl rand -base64 32>

# ── Blockchain ───────────────────────────────────
PRIVATE_KEY=0x_your_testnet_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# ── ZeroDev (Agent Mode) ────────────────────────
ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v2/bundler/...

# ── Session Encryption ──────────────────────────
SESSION_ENCRYPTION_KEY=<openssl rand -hex 32>

# ── Backend ──────────────────────────────────────
BACKEND_PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

**`web/.env.local`** (frontend):

```env
NEXTAUTH_SECRET=<same as above>
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=<same as above>
NEXT_PUBLIC_ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v2/bundler/...
SESSION_ENCRYPTION_KEY=<same as above>
```

### 3. Start Database

```bash
docker compose up -d      # PostgreSQL on port 5433
npx prisma db push --schema=./web/prisma/schema.prisma
```

### 4. Start Backend & Frontend

```bash
# Terminal 1 — NestJS API
npm run start:dev

# Terminal 2 — Next.js frontend
cd web && npm run dev
```

Open `http://localhost:3000` → Connect MetaMask → Start chatting.

---

## 🔀 Switching LLM Providers

| Provider | Env Var | Default Model |
|:---------|:--------|:--------------|
| **Google** (default) | `GEMINI_API_KEY` | `gemini-2.5-flash` |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` |
| **Anthropic** | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Streaming, tools, and confirmation behavior stay the same.

---

## 🧩 Adding a New Tool

Tools are registered in `src/chat/chat-tools.builder.ts` using the Vercel AI SDK `tool()` helper:

```typescript
// Inside buildTools() in chat-tools.builder.ts
get_network_status: tool({
    description: "Get current block number and gas price.",
    parameters: z.object({}),
    execute: async () => {
        const [block, gasPrice] = await Promise.all([
            pc.getBlockNumber(),
            pc.getGasPrice(),
        ]);
        return JSON.stringify({
            block: block.toString(),
            gas_gwei: (Number(gasPrice) / 1e9).toFixed(4),
        });
    },
}),
```

- **Read tools**: Include `execute` → invoked during the agent turn
- **Write tools**: Omit `execute` → returned to the client for **ConfirmationModal**, then `/api/execute-tool`

For write tools, add a matching handler in `src/execute-tool/execute-tool.service.ts`.

---

## 📁 Project Structure

```
dimensity/
├── src/                          # NestJS backend (port 4000)
│   ├── main.ts                   # API entry point
│   ├── app.module.ts             # Root module (throttler, scheduler, modules)
│   ├── auth/session.guard.ts     # JWT guard using NextAuth tokens
│   ├── chat/
│   │   ├── chat.service.ts       # Streaming chat orchestration
│   │   └── chat-tools.builder.ts # 17 tool definitions + LLM provider selection
│   ├── execute-tool/
│   │   └── execute-tool.service.ts  # Write tool execution + spending limits
│   ├── blockchain/
│   │   ├── permissioned-account.service.ts  # ZeroDev session key reconstruction
│   │   └── crypto.util.ts        # AES-256-CBC encrypt/decrypt
│   ├── wallets/                  # REST API for wallet management
│   ├── conversations/            # REST API for chat history
│   ├── common/
│   │   ├── filters/              # Global exception filter
│   │   ├── dto/                  # Validated request DTOs
│   │   ├── pipes/                # EthereumAddressPipe
│   │   └── tasks/                # Nonce cleanup cron
│   ├── tools/                    # Standalone tool implementations (CLI)
│   ├── providers/                # LLM provider abstraction (CLI)
│   └── signers/                  # Signer abstraction (LocalSigner, KernelSigner)
├── web/                          # Next.js 15 frontend
│   ├── app/
│   │   ├── page.tsx              # Main page (auth gate)
│   │   ├── layout.tsx            # Root layout
│   │   └── api/
│   │       ├── auth/             # NextAuth SIWE routes
│   │       └── agent/session/    # Prepare, authorize, revoke, status
│   ├── components/
│   │   ├── ChatInterface.tsx     # Chat UI with streaming
│   │   ├── ConfirmationModal.tsx # Write tool approval (manual + agent)
│   │   ├── AgentMode.tsx         # Session key setup (ZeroDev)
│   │   ├── ConnectWallet.tsx     # SIWE login
│   │   ├── Header.tsx            # Wallet selector + agent status
│   │   ├── Sidebar.tsx           # Conversation history
│   │   └── MessageBubble.tsx     # Markdown message renderer
│   ├── lib/
│   │   ├── auth.ts               # NextAuth v5 config
│   │   ├── prisma.ts             # Prisma singleton
│   │   └── sessionCache.ts       # In-memory pending session store
│   └── prisma/schema.prisma      # Database schema (8 models)
├── docker-compose.yml            # PostgreSQL + API
├── Dockerfile                    # Multi-stage production build
└── .github/workflows/ci.yml     # CI/CD (build + deploy to EC2)
```

---

## 🎯 Design Decisions

| Decision | Choice | Rationale |
|:---------|:-------|:----------|
| **Provider-agnostic LLM** | Vercel AI SDK adapters | Swap Gemini ↔ GPT ↔ Claude without rewriting tools |
| **ZeroDev Kernel v3.1** | Smart account session keys | Autonomous execution with on-chain policy enforcement |
| **Dual execution mode** | Manual + Agent | User chooses between explicit control and autonomous convenience |
| **NestJS HTTP API** | Primary backend | Chat, tools, DB routes; Next.js proxies via rewrites |
| **SIWE over Passkeys** | MetaMask-first | Audience already uses browser wallets |
| **AES-256-CBC encryption** | Session key storage | Private keys encrypted at rest, wiped on revocation |
| **Transaction idempotency** | `TransactionLog` with unique `toolCallId` | Financial writes cannot be double-executed |
| **Gas sponsorship** | ZeroDev paymaster | Users never need testnet ETH for gas fees |

---

## 🧰 Tech Stack

| Technology | Role |
|:-----------|:-----|
| **Next.js 15** | App Router — UI, NextAuth, agent session APIs |
| **NestJS 11** | HTTP API — streaming chat, tool execution, wallets, conversations |
| **Vercel AI SDK 4** | Streaming LLM orchestration with tool calling |
| **ZeroDev SDK 5** | Smart account creation, session keys, paymaster integration |
| **viem 2** | Type-safe Ethereum client (Base Sepolia) |
| **siwe** | Sign-In with Ethereum |
| **NextAuth.js v5** | JWT session management |
| **Prisma 6** | PostgreSQL ORM (8 models) |
| **Docker + Docker Compose** | Containerized dev and production |
| **@nestjs/throttler** | Rate limiting (3-tier) |
| **helmet** | HTTP security headers |
| **class-validator** | DTO-based input validation |
| **react-markdown + remark-gfm** | Chat markdown rendering |
| **Zod** | Tool parameter schemas |
| **GitHub Actions** | CI/CD — build validation + EC2 deployment |

---

## 📦 Database Schema

8 Prisma models powering the application:

| Model | Purpose |
|:------|:--------|
| `User` | User identity (auto-created on first SIWE login) |
| `Wallet` | Multi-wallet support with active flag and nicknames |
| `Contact` | Address → nickname mappings for natural language sends |
| `Conversation` | Chat threads with auto-titling |
| `Message` | User and assistant messages (persistent history) |
| `Nonce` | SIWE replay protection (expiry + single-use) |
| `TransactionLog` | Idempotent transaction audit trail |
| `AgentSession` | ZeroDev session keys, permissions, status, expiry |

---

<div align="center">

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

</div>
