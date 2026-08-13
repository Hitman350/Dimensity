<div align="center">

<br />

# Dimensity

### Talk to your crypto. Execute on-chain.

[![Node.js](https://img.shields.io/badge/Node.js-≥20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-4-000000?style=flat-square&logo=vercel&logoColor=white)](https://sdk.vercel.ai)
[![viem](https://img.shields.io/badge/viem-2.x-1E1E20?style=flat-square)](https://viem.sh)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![AWS](https://img.shields.io/badge/AWS-EC2_·_RDS_·_Amplify-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**An autonomous AI agent that replaces dApp UIs with natural language.**  
**Connect your wallet. Type what you want. Watch it execute.**

[What it does](#what-you-can-do) · [Features](#feature-highlights) · [Security](#6-layer-security-model) · [Architecture](#architecture--infrastructure) · [Quick Start](#quick-start) · [Tools](#17-registered-tools) · [License](#license)

<br />

</div>

---

## The Problem

Interacting with a chain today often means:

- Jumping between **many dApp UIs** for transfers, deploys, and balance checks
- **Copy-pasting** hex addresses and guessing what transaction data does
- **Weak guardrails** before you sign — easy to misread calldata or miss risk
- **No continuity** — little shared context between sessions (contacts, history, intent)

## The Solution

Dimensity turns that into **one chat**. You describe intent in plain language; a **tool-calling agent** (Vercel AI SDK + viem) plans steps, runs read operations automatically, and pauses **writes** until you confirm in the UI.

```
You:   "Send 0.05 ETH to Alice"
Agent: Resolved Alice → 0x123...abc
       Gas estimate: 0.000042 ETH. Confirm?
       [User clicks Confirm]
Agent: ✅ Sent! Tx: 0xdef...789
       Save Alice as a contact?
```

The web app uses **Sign-In with Ethereum (SIWE)** and **JWT sessions**, keeps **multi-wallet and contact** data in PostgreSQL, and streams assistant replies with **markdown**.

> **Compared to read-only dashboards** (aggregators that mostly show balances and positions), Dimensity is built to **reason, call chain tools, and act** — with explicit approval for anything that spends gas or deploys code.

---

## 🎯 What you can do

Dimensity is both an **execution surface** and a **research assistant** for the configured network:

| Area | Examples |
|:-----|:---------|
| **Money movement** | Send native ETH; estimate gas before sends; use **saved contacts** so you can say "pay Alice" instead of pasting `0x…` |
| **Wallets & identity** | Register **multiple wallets**, switch the active one, rename them — the model uses your **active wallet** for balances and sends |
| **Portfolio & activity** | Check balance, recent **transaction history** (via the explorer API), and **ETH price** in USD/EUR for rough fiat context |
| **Tokens** | Read **ERC-20 metadata** (name, symbol, decimals, supply); **deploy** a standard ERC-20 with name, symbol, and initial supply (confirmed in UI) |
| **Safety & understanding** | **Explain** any tx hash in plain language; **scan** contract bytecode for risky patterns (e.g. mint, pause, ownership transfer); the agent is instructed to **refuse high-risk sends** when scans look critical |
| **Continuity** | **Persistent chats** with sidebar history, auto-titled threads, and structured follow-ups (e.g. estimate gas → then send, as in the system prompt) |

The **HTTP API** is a **NestJS** app at the repository root (`src/main.ts`): chat streaming, tools, conversations, wallets, and execute-tool all run there. **Next.js** (`web/`) serves the UI and **NextAuth** (`/api/auth/*` only); it **proxies** `/api/chat`, `/api/conversations`, `/api/wallets`, and `/api/execute-tool` to the Nest server (see `web/next.config.ts`). An optional **NestJS CLI** (`npm run build && npm run start:cli`) runs the older terminal agent without HTTP.

---

## ✨ Feature Highlights

<table>
<tr>
<td width="50%">

### 🔐 Authentication & Identity
- **SIWE Login** — prove wallet ownership via cryptographic signature
- **Multi-Wallet** — add multiple wallets, switch active context seamlessly
- **Contact Book** — save address→nickname mappings for natural language sending
- **Injected context** — each request includes active wallet address and nickname for consistent answers

</td>
<td width="50%">

### ⚡ Transaction Execution
- **Send ETH** — signs and broadcasts native transfers (after confirmation)
- **Deploy ERC-20** — deploys tokens with name, symbol, and supply via compiled bytecode
- **Gas Estimation** — `estimate_gas` tool surfaces cost before you approve a send
- **Client Confirmation** — write operations surface in a confirmation step before broadcast

</td>
</tr>
<tr>
<td width="50%">

### 🔍 Analysis & Intelligence
- **Explain Transaction** — decodes a tx hash into a readable summary
- **Contract Scanner** — analyzes bytecode for notable selectors (mint, blacklist, pause, etc.)
- **Token Info** — reads `name`, `symbol`, `decimals`, `totalSupply` from ERC-20s
- **Live ETH Price** — USD/EUR via CoinGecko with a short in-memory cache

</td>
<td width="50%">

### 💬 Conversation History
- **Persistent Chats** — conversations stored in PostgreSQL
- **Sidebar Navigation** — browse, switch, and delete past conversations
- **Auto-Titling** — conversations named from your first message
- **Markdown Rendering** — assistant messages rendered with rich text, lists, and code blocks

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

## 🔒 6-Layer Security Model

Dimensity implements defense-in-depth across every interaction surface. Each layer is backed by a concrete implementation — not just a buzzword.

```mermaid
graph LR
    A["🔑 SIWE Auth"] --> B["🔄 Replay Guard"] --> C["🛡️ JWT Sessions"] --> D["🗝️ Key Isolation"] --> E["✋ Write Confirmation"] --> F["📋 Audit Trail"]

    style A fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style B fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style C fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style D fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style E fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style F fill:#1a1a2e,stroke:#8B5CF6,color:#fff
```

| Layer | What It Does | Implementation |
|:------|:-------------|:---------------|
| **SIWE Auth** | Proves wallet ownership cryptographically | `viem.verifyMessage()` — no passwords |
| **Replay Guard** | Prevents signature reuse | Server nonce, 5-min expiry, single-use |
| **JWT Sessions** | Stateless auth, no session table for tokens | 7-day expiry, signed tokens |
| **Key Isolation** | LLM never sees private keys | Structured intents only; signing happens in configured execution path |
| **Write Confirmation** | User must approve each write | Confirmation UI before `/api/execute-tool` runs send/deploy |
| **Audit Trail** | Conversation history persisted | Messages stored in PostgreSQL |

### Additional Security Hardening

Beyond the 6 core layers, the following production-grade protections are implemented:

| Protection | Implementation | Why it matters |
|:-----------|:---------------|:---------------|
| **Transaction Idempotency** | Duplicate transactions blocked via unique `toolCallId` tracking in a `TransactionLog` table (PostgreSQL). A repeat call returns the existing result instead of re-executing. | Financial transactions **must** be idempotent — double-clicks or retries cannot broadcast the same tx twice. |
| **Input Validation** | NestJS `ValidationPipe` (global) with `class-validator` DTOs (`ChatRequestDto`, `ExecuteToolDto`, `AddWalletDto`) and a custom `EthereumAddressPipe` that validates and EIP-55 checksums addresses via `viem.isAddress()`. `whitelist: true` strips unknown fields; `forbidNonWhitelisted: true` rejects them. | Prevents injection, malformed data, and garbage addresses from ever reaching business logic or chain RPCs. |
| **Rate Limiting & Protection** | `@nestjs/throttler` with 3-tier limits (3/sec, 20/10s, 100/min) applied globally; the `/api/chat` LLM endpoint has a stricter 2 req/5s override. `helmet` sets HTTP security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.). Request body capped at 16 KB. | Protects LLM API budget from abuse, prevents DoS, and hardens HTTP transport. |
| **Automated State Cleanup** | A `@nestjs/schedule` CRON job (`NonceCleanupService`) runs every hour and aggressively purges all expired or used cryptographic nonces from the database. | Prevents unbounded database growth — without this, the `Nonce` table would accumulate stale rows indefinitely. |
| **Global Exception Filter** | `AllExceptionsFilter` catches every unhandled error. Clients receive a structured JSON response (status, message, timestamp, path) — **never** a stack trace. 500+ errors are logged server-side. | Prevents leaking internal file paths, SQL errors, or stack traces to attackers. |

---

## 🏗️ Architecture & Infrastructure

### Production Deployment (AWS)

```
┌──────────────────────────────┐
│      AWS Amplify              │
│      (Next.js Frontend)       │
│      dimensity.amplify.app    │
└──────────────┬───────────────┘
               │ /api/* rewrites
               ▼
┌──────────────────────────────┐     ┌──────────────────────────┐
│      AWS EC2 (t3.micro)      │     │   NestJS API             │
│      Docker Compose          │────▶│   Port 4000              │
│      api.dimensity.app       │     │   helmet + throttler     │
└──────────────────────────────┘     └────────────┬─────────────┘
                                                  │
                            ┌─────────────────────┼─────────────────────┐
                            ▼                     ▼                     ▼
                    ┌──────────────┐     ┌────────────────┐    ┌──────────────┐
                    │ AWS RDS      │     │ AWS SSM        │    │ CloudWatch   │
                    │ PostgreSQL   │     │ Parameter      │    │ (Logs +      │
                    │ (db.t3.micro)│     │ Store (secrets)│    │  Metrics)    │
                    └──────────────┘     └────────────────┘    └──────────────┘
```

| Component | Service | Role |
|:----------|:--------|:-----|
| **Frontend** | AWS Amplify (Next.js) | SSR/SSG hosting, automatic builds on push |
| **Backend API** | AWS EC2 (`t3.micro`) running NestJS via Docker Compose | Chat streaming, tool execution, wallet management |
| **Database** | AWS RDS PostgreSQL (`db.t3.micro`) | Users, wallets, conversations, transaction logs, nonces |
| **Secrets Management** | AWS Systems Manager (SSM) Parameter Store | API keys, private keys, `DATABASE_URL` — never in `.env` in prod |
| **Monitoring** | CloudWatch | Structured JSON logs, request tracing, error alerting |

### How a Request Flows

```mermaid
sequenceDiagram
    actor User
    participant UI as Chat UI
    participant API as Nest API
    participant LLM as LLM Provider
    participant Chain as Blockchain

    User->>UI: "Send 0.05 ETH to Alice"
    UI->>API: POST /api/chat + JWT
    API->>API: Auth · load wallet · inject context
    API->>LLM: Stream with tools
    LLM->>API: resolve_contact("Alice")
    API->>API: Auto-execute (read tool)
    API->>LLM: Alice → 0x123...abc
    LLM->>API: send_transaction(0x123, 0.05)
    API-->>UI: Pending write → needs approval
    UI->>User: "Send 0.05 ETH to Alice?"
    User->>UI: ✅ Confirm
    UI->>API: POST /api/execute-tool
    API->>Chain: Broadcast signed tx
    Chain-->>UI: ✅ Tx confirmed
```

### Read vs Write Tool Execution

```mermaid
flowchart LR
    A["LLM tool call"] --> B{"Has execute fn?"}
    B -->|"Yes"| C["✅ Auto-execute"]
    B -->|"No"| D["⏸️ Ask user"]
    D --> E{"Approved?"}
    E -->|"Yes"| F["Execute on-chain"]
    E -->|"No"| G["Cancel"]
    C --> H["Result → LLM"]
    F --> H

    style A fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style B fill:#1a1a2e,stroke:#F59E0B,color:#fff
    style C fill:#1a1a2e,stroke:#10B981,color:#fff
    style D fill:#1a1a2e,stroke:#EF4444,color:#fff
    style F fill:#1a1a2e,stroke:#10B981,color:#fff
```

### System Layers

```mermaid
graph TB
    subgraph Frontend["Next.js Frontend · AWS Amplify"]
        UI["Chat UI + Sidebar"]
        Modal["Confirmation Modal"]
    end

    subgraph NextAuthOnly["Next.js · Auth only"]
        NA["/api/auth/* · SIWE + JWT"]
    end

    subgraph Backend["NestJS HTTP API · AWS EC2 Docker"]
        Agent["Agent loop + tools"]
        Exec["execute-tool"]
        Guard["ThrottlerGuard + ValidationPipe"]
    end

    subgraph Data["Data Layer · AWS RDS"]
        DB["PostgreSQL"]
        Prisma["Prisma ORM"]
    end

    subgraph LLM["LLM Providers"]
        G["Gemini"]
        O["OpenAI"]
        A["Anthropic"]
    end

    subgraph Chain["Blockchain"]
        Viem["viem Client"]
        Net["Ethereum Sepolia"]
    end

    UI --> Agent
    Modal --> Exec
    Agent --> G & O & A
    Agent --> Viem --> Net
    Exec --> Viem
    NA --> Prisma --> DB
    Agent --> Prisma
    Guard --> Agent & Exec

    style UI fill:#1a1a2e,stroke:#8B5CF6,color:#fff
    style Agent fill:#1a1a2e,stroke:#10B981,color:#fff
    style DB fill:#1a1a2e,stroke:#F59E0B,color:#fff
    style Net fill:#1a1a2e,stroke:#EF4444,color:#fff
    style Guard fill:#1a1a2e,stroke:#EF4444,color:#fff
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
| 9 | `get_wallet_history` | Read | Fetch recent transactions from explorer API |
| 10 | `get_eth_price` | Read | Fetch live ETH/USD and ETH/EUR prices (60s cache) |
| 11 | `list_wallets` | Read | List all wallets for the authenticated user |
| 12 | `switch_wallet` | Read | Switch the active wallet (atomic DB transaction) |
| 13 | `rename_wallet` | Read | Update a wallet's nickname |
| 14 | `add_contact` | Read | Save an address → nickname mapping |
| 15 | `resolve_contact` | Read | Look up an address by contact nickname |
| 16 | `get_contacts` | Read | List all saved contacts |
| 17 | `remove_contact` | Read | Delete a contact entry |

> **Read tools** define an `execute` handler and run on the server during the agent turn.  
> **Write tools** omit `execute`, so the client shows **ConfirmationModal** and completes execution via `/api/execute-tool`.

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

## 🚀 Quick Start

### Prerequisites

| Requirement | Source |
|:------------|:-------|
| **Docker** & **Docker Compose** | [docker.com](https://docker.com) |
| **Node.js ≥ 20** | [nodejs.org](https://nodejs.org) |
| **MetaMask** | [metamask.io](https://metamask.io) |
| **LLM API Key** (any one) | [Gemini](https://aistudio.google.com/) · [OpenAI](https://platform.openai.com/) · [Anthropic](https://console.anthropic.com/) |

### 1. Clone & Install

```bash
git clone https://github.com/Hitman350/dimensity.git
cd dimensity
npm install
cd web && npm install && cd ..
```

### 2. Configure Environment

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

The `.env.example` documents every required variable:

```env
# ── LLM Provider (pick ONE) ──────────────────────
GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# ── Database ─────────────────────────────────────
DATABASE_URL=postgresql://dimensity:localdevonly@localhost:5432/dimensity

# ── Auth ─────────────────────────────────────────
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# ── Signer (development only) ───────────────────
PRIVATE_KEY=0x_your_testnet_private_key

# ── Backend ──────────────────────────────────────
BACKEND_PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
```

### 3. Start Database & API (Docker)

```bash
# Start PostgreSQL and the NestJS API via Docker
docker compose up -d

# Run Prisma migrations
cd web && npx prisma migrate dev --name init && cd ..
```

### 4. Start the Frontend

```bash
cd web && npm run dev
```

Open `http://localhost:3000` → Connect MetaMask → Start chatting.

> **Without Docker:** If you prefer running the API directly, start PostgreSQL separately and run `npm run start:dev` in the repo root. The API listens on `http://127.0.0.1:4000`.

---

## 🔀 Switching LLM Providers

Dimensity is **provider-agnostic**. Swap models with environment variables:

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

Tools are registered in `src/chat/chat-tools.builder.ts` (`buildTools()`) using the Vercel AI SDK `tool()` helper:

```typescript
// Inside buildTools() in chat-tools.builder.ts
get_network_status: tool({
    description: "Get current block number and gas price.",
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

- **Read tools**: Include `execute` → invoked during the agent turn  
- **Write tools**: Omit `execute` → returned to the client for **ConfirmationModal**, then `/api/execute-tool`

Add a matching handler in `src/execute-tool/execute-tool.service.ts` if the tool performs an on-chain write.

---

## 🎯 Design Decisions

| Decision | Choice | Rationale |
|:---------|:-------|:----------|
| **Provider-agnostic LLM** | Vercel AI SDK adapters | Swap Gemini ↔ GPT ↔ Claude without rewriting tools |
| **NestJS HTTP API** | Primary backend (`src/main.ts`) | Chat, tools, DB-backed routes; Next.js proxies `/api/*` except auth |
| **Docker Compose** | Local dev + production parity | One command to spin up PostgreSQL + API; identical image runs on EC2 |
| **AWS EC2 + RDS** | Production infrastructure | Dedicated compute (t3.micro) + managed PostgreSQL — no vendor lock-in |
| **SSM Parameter Store** | Secrets management | API keys, private keys never in `.env` in production |
| **Signer abstraction** | `LocalSigner` / `KernelSigner` (CLI) | Model outputs intent; crypto stays in signer layer |
| **SIWE over Passkeys** | MetaMask-first | Audience already uses browser wallets |
| **Transaction idempotency** | `TransactionLog` with unique `toolCallId` | Financial writes cannot be double-executed |
| **Persistent conversations** | PostgreSQL via Prisma | Full chat history with auto-titling |
| **Markdown rendering** | react-markdown + remark-gfm | Readable structured answers |

---

## 🧰 Tech Stack

| Technology | Role |
|:-----------|:-----|
| **Next.js 15** | App Router — UI; NextAuth (`/api/auth/*`); rewrites to Nest for app APIs |
| **NestJS 11** | HTTP API — streaming chat, Prisma, execute-tool, wallets, conversations |
| **Vercel AI SDK 4** | Streaming LLM orchestration with tool calling |
| **viem 2** | Type-safe Ethereum client |
| **siwe** | Sign-In with Ethereum |
| **NextAuth.js v5** | JWT session management |
| **Prisma 6** | PostgreSQL ORM |
| **Docker + Docker Compose** | Containerized development and production |
| **AWS Amplify** | Frontend hosting (Next.js SSR) |
| **AWS EC2** | Backend compute (NestJS via Docker) |
| **AWS RDS PostgreSQL** | Managed database |
| **AWS SSM Parameter Store** | Secrets management |
| **@nestjs/throttler** | Rate limiting (3-tier + per-endpoint overrides) |
| **helmet** | HTTP security headers |
| **class-validator** | DTO-based input validation |
| **react-markdown** | Chat markdown rendering |
| **Zod** | Tool parameter schemas |
| **React 19** | UI |

---

<div align="center">

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

</div>
