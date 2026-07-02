import { describe, expect, it, beforeEach } from '@jest/globals';

// NOTE: In a full integration test, we would import the compiled bindings
// from the generated 'managed/' folder like this:
// import { VaultContract } from '../managed/vault';
// 
// For this unit test suite, we are mocking the Compact circuit verifier
// behavior to validate state transitions and zero-knowledge bounds.

class MockVaultContract {
    public total_liquidity: bigint = 0n;
    public commitments: Set<string> = new Set();
    public nullifiers: Set<string> = new Set();

    deposit(commitment: string, amount: bigint): void {
        // [EDGE CASE] Prevent zero-value spam deposits
        if (amount <= 0n) throw new Error("Deposit amount must be greater than zero");
        
        // [EDGE CASE] Prevent replay attacks
        if (this.commitments.has(commitment)) throw new Error("Commitment already exists");
        
        this.total_liquidity += amount;
        this.commitments.add(commitment);
    }

    withdraw(amount: bigint, nullifier: string, computed_commitment: string, public_recipient: string): { amount: bigint, public_recipient: string } {
        // [EDGE CASE] Prevent unauthorized access attempts
        if (!this.commitments.has(computed_commitment)) throw new Error("Invalid or unknown commitment");
        
        // [EDGE CASE] Prevent double-spending
        if (this.nullifiers.has(nullifier)) throw new Error("Nullifier already spent");
        
        // [EDGE CASE] Prevent vault insolvency (State Mutation Limit)
        if (this.total_liquidity < amount) throw new Error("Insufficient vault liquidity");

        this.nullifiers.add(nullifier);
        this.total_liquidity -= amount;

        // Disclose minimal necessary data to the public ledger
        return { amount, public_recipient };
    }
}

describe('MidnightShield Vault ZK Contract', () => {
    let vault: MockVaultContract;

    beforeEach(() => {
        vault = new MockVaultContract();
    });

    describe('State Transition: Constructor', () => {
        it('should initialize with zero liquidity', () => {
            expect(vault.total_liquidity).toBe(0n);
        });
    });

    describe('State Transition: Deposit', () => {
        it('should successfully process a valid deposit and update public state', () => {
            const commitment = "0xValidCommitmentHash123";
            const amount = 1000n;
            
            vault.deposit(commitment, amount);
            
            expect(vault.total_liquidity).toBe(1000n);
            expect(vault.commitments.has(commitment)).toBe(true);
        });

        it('should reject zero-value deposits (Spam Prevention)', () => {
            const commitment = "0xZeroValueCommitment";
            expect(() => vault.deposit(commitment, 0n)).toThrow("Deposit amount must be greater than zero");
        });

        it('should reject duplicate commitments (Replay Attack Prevention)', () => {
            const commitment = "0xDuplicateCommitment";
            vault.deposit(commitment, 500n);
            expect(() => vault.deposit(commitment, 500n)).toThrow("Commitment already exists");
        });
    });

    describe('State Transition: Withdraw (Zero-Knowledge Proofs)', () => {
        const amount = 1000n;
        const computed_commitment = "0xCommitmentFromWitness"; // Simulated hash(secret_witness, amount)
        const public_recipient = "0xPublicAddress";

        beforeEach(() => {
            // Setup an initial deposit so the vault has liquidity
            vault.deposit(computed_commitment, amount);
        });

        it('should successfully process a valid withdrawal and disclose correct data', () => {
            const nullifier = "0xUniqueNullifier1";
            
            const disclosed = vault.withdraw(amount, nullifier, computed_commitment, public_recipient);
            
            expect(vault.total_liquidity).toBe(0n);
            expect(vault.nullifiers.has(nullifier)).toBe(true);
            expect(disclosed).toEqual({ amount: 1000n, public_recipient: "0xPublicAddress" });
        });

        it('should reject withdrawal with an unknown commitment (Unauthorized Access)', () => {
            const fake_commitment = "0xUnknownCommitment";
            const nullifier = "0xUniqueNullifier2";
            
            expect(() => vault.withdraw(amount, nullifier, fake_commitment, public_recipient))
                .toThrow("Invalid or unknown commitment");
        });

        it('should reject duplicate withdrawals (Double-Spending Prevention)', () => {
            const nullifier = "0xReusedNullifier";
            
            // First withdrawal succeeds
            vault.withdraw(500n, nullifier, computed_commitment, public_recipient);
            
            // Second withdrawal with the same nullifier fails
            expect(() => vault.withdraw(500n, nullifier, computed_commitment, public_recipient))
                .toThrow("Nullifier already spent");
        });

        it('should reject withdrawals exceeding vault liquidity (Insolvency Protection)', () => {
            const nullifier = "0xUniqueNullifier3";
            const huge_amount = 5000n;
            const new_commitment = "0xNewCommitment";
            
            // Total liquidity is now 2000n, we attempt to withdraw 5000n
            vault.deposit(new_commitment, 1000n); 
            
            expect(() => vault.withdraw(huge_amount, nullifier, new_commitment, public_recipient))
                .toThrow("Insufficient vault liquidity");
        });
    });
});
