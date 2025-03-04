import { TokenContract } from '@aztec/noir-contracts.js/Token';
import type { AztecAddress, Logger, Wallet } from '@aztec/aztec.js';
export declare function deployToken(adminWallet: Wallet, initialAdminBalance: bigint, logger: Logger): Promise<TokenContract>;
export declare function mintTokensToPrivate(token: TokenContract, minterWallet: Wallet, recipient: AztecAddress, amount: bigint): Promise<void>;
//# sourceMappingURL=index.d.ts.map