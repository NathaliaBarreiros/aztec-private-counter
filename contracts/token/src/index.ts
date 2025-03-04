import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import {
    Fr,
    GrumpkinScalar,
    type PXE,
    createLogger,
    createPXEClient,
    waitForPXE,
} from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { format } from 'util';
import type { AztecAddress, Logger, Wallet } from '@aztec/aztec.js';

// Desplegar un contrato de token en la red de Aztec.
export async function deployToken(adminWallet: Wallet, initialAdminBalance: bigint, logger: Logger) {
    logger.info(`Deploying Token contract...`);
    const contract = await TokenContract.deploy(adminWallet, adminWallet.getAddress(), 'TokenName', 'TokenSymbol', 18)
        .send()
        .deployed();

    if (initialAdminBalance > 0n) {
        // Minter is minting to herself so contract as minter is the same as contract as recipient
        await mintTokensToPrivate(contract, adminWallet, adminWallet.getAddress(), initialAdminBalance);
    }

    logger.info('L2 contract deployed');

    return contract;
}

// Mintear tokens de forma privada a una dirección específica
export async function mintTokensToPrivate(
    token: TokenContract,
    minterWallet: Wallet,
    recipient: AztecAddress,
    amount: bigint,
) {
    const tokenAsMinter = await TokenContract.at(token.address, minterWallet);
    const from = minterWallet.getAddress(); // we are setting from to minter here because we need a sender to calculate the tag
    await tokenAsMinter.methods.mint_to_private(from, recipient, amount).send().wait();
}

const { PXE_URL = 'http://localhost:8080' } = process.env;

// Configurar el cliente PXE y conectarse al entorno de Aztec.
// Proceso:
// Crea un cliente PXE conectado a la URL del sandbox.
// Espera a que el sandbox esté listo.
// Obtiene y registra la información del nodo del sandbox.
async function main() {
    ////////////// CREATE THE CLIENT INTERFACE AND CONTACT THE SANDBOX //////////////
    const logger = createLogger('e2e:token');

    // We create PXE client connected to the sandbox URL
    const pxe = createPXEClient(PXE_URL);
    // Wait for sandbox to be ready
    await waitForPXE(pxe, logger);

    const nodeInfo = await pxe.getNodeInfo();

    logger.info(format('Aztec Sandbox Info ', nodeInfo));

    ////////////// LOAD SOME ACCOUNTS FROM THE SANDBOX //////////////
    // The sandbox comes with a set of created accounts. Load them
    const accounts = await getDeployedTestAccountsWallets(pxe);
    const aliceWallet = accounts[0];
    const bobWallet = accounts[1];
    const alice = aliceWallet.getAddress();
    const bob = bobWallet.getAddress();
    logger.info(`Loaded alice's account at ${alice.toString()}`);
    logger.info(`Loaded bob's account at ${bob.toString()}`);

    ////////////// DEPLOY OUR TOKEN CONTRACT //////////////

    const initialSupply = 1_000_000n;

    const tokenContractAlice = await deployToken(aliceWallet, initialSupply, logger);

    ////////////// QUERYING THE TOKEN BALANCE FOR EACH ACCOUNT //////////////

    // Bob wants to mint some funds, the contract is already deployed, create an abstraction and link it his wallet
    // Since we already have a token link, we can simply create a new instance of the contract linked to Bob's wallet
    const tokenContractBob = tokenContractAlice.withWallet(bobWallet);

    let aliceBalance = await tokenContractAlice.methods.balance_of_private(alice).simulate();
    logger.info(`Alice's balance ${aliceBalance}`);

    let bobBalance = await tokenContractBob.methods.balance_of_private(bob).simulate();
    logger.info(`Bob's balance ${bobBalance}`);

    ////////////// TRANSFER FUNDS FROM ALICE TO BOB //////////////

    // We will now transfer tokens from ALice to Bob
    const transferQuantity = 543n;
    logger.info(`Transferring ${transferQuantity} tokens from Alice to Bob...`);
    await tokenContractAlice.methods.transfer(bob, transferQuantity).send().wait();

    // Check the new balances
    aliceBalance = await tokenContractAlice.methods.balance_of_private(alice).simulate();
    logger.info(`Alice's balance ${aliceBalance}`);

    bobBalance = await tokenContractBob.methods.balance_of_private(bob).simulate();
    logger.info(`Bob's balance ${bobBalance}`);

    ////////////// MINT SOME MORE TOKENS TO BOB'S ACCOUNT //////////////

    // Now mint some further funds for Bob

    // Alice is nice and she adds Bob as a minter
    await tokenContractAlice.methods.set_minter(bob, true).send().wait();

    const mintQuantity = 10_000n;
    await mintTokensToPrivate(tokenContractBob, bobWallet, bob, mintQuantity);

    // Check the new balances
    aliceBalance = await tokenContractAlice.methods.balance_of_private(alice).simulate();
    logger.info(`Alice's balance ${aliceBalance}`);

    bobBalance = await tokenContractBob.methods.balance_of_private(bob).simulate();
    logger.info(`Bob's balance ${bobBalance}`);
}

main();