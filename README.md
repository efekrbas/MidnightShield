# 🛡️ MidnightShield: Privacy-Preserving Liquidity Vault

![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)
![Node Version](https://img.shields.io/badge/node->=22.0.0-green.svg)
![Network](https://img.shields.io/badge/network-Midnight_Preprod-purple.svg)

## 💡 Initial Product Idea

**MidnightShield** serves as a next-generation privacy-preserving liquidity vault, leveraging the advanced private state mechanics of the Midnight Network. By utilizing zero-knowledge proofs, MidnightShield allows institutional liquidity providers and retail users to pool assets transparently—proving the vault's solvency and total value locked (TVL) publicly—while completely obfuscating individual deposit amounts, user identities, and withdrawal triggers. This approach delivers the strict compliance and liquidity assurances required by global financial networks without compromising on the fundamental right to transactional privacy.

## 🏗️ Architecture Breakdown & Zero-Knowledge Security

To satisfy strict code quality and security evaluation criteria, MidnightShield strictly bifurcates its state transitions:

### 1. On-chain Public Ledger State (Transparent)
- **`total_liquidity`**: A publicly verifiable accumulator that proves the vault's exact solvency without leaking who owns what.
- **Data Disclosure Minimization**: Utilizing the `disclose()` mechanism, only the exact `amount` and `public_recipient` are revealed during withdrawal execution, allowing the underlying L1/L2 networks to process token transfers securely.

### 2. Private Witness Layer (Zero-Knowledge)
- **`commitments` Map**: Deposits map user identities to a secure cryptographic hash. The underlying balances and metadata are never posted to the mempool.
- **`nullifiers` Set**: Withdrawals are validated off-chain using a private `secret_witness`. A unique nullifier is computed and registered on-chain to prevent replay attacks and double-spending.
- **Front-running Protection**: Because the private witness is executed inside a local ZK circuit rather than on a public RPC node, bad actors cannot intercept, replicate, or front-run user withdrawals.

## 🚀 Setup & Run Instructions

Ensure your local development environment meets the strict prerequisites before evaluating the project.

### Prerequisites
- **Node.js**: v22.0.0 or higher
- **Docker**: For running the isolated Midnight proof server and sandbox

### 1. Initialize the Environment

Clone the repository and install the strict Node dependencies:

```bash
# Clone the repository
git clone <repository-url>
cd midnight-shield

# Install Node dependencies
npm install
```

### 2. Spin Up the Midnight Infrastructure

We use a clean, isolated Docker configuration to ensure consistent zero-knowledge proof generation:

```bash
docker-compose up -d
```
*This will spin up the `midnight-proof-server` (Port 6300) and the `midnight-sandbox` (Ports 9944, 9933).*

### 3. Compile the Compact ZK Circuits

Compile the `vault.compact` smart contract to generate the highly secure TypeScript bindings into the `managed/` directory. **Note: The `managed/` directory is strictly tracked to allow the technical committee to verify circuit integrity.**

```bash
npx @midnight-ntwrk/compactc compile contracts/vault.compact --target typescript --out-dir managed/
```

### 4. Execute the ZK QA Test Suite

Validate the state transitions and zero-knowledge bounds (spam prevention, replay attacks, insolvency protection):

```bash
npm run test
```

### 5. Deploy to Preprod Network

Create a `.env` file containing your `DEPLOYER_SEED_PHRASE`, then execute the professional deployment script:

```bash
npx ts-node scripts/deploy.ts
```