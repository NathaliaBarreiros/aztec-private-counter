import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import { createLogger, createPXEClient, waitForPXE, } from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { format } from 'util';
// Desplegar un contrato de token en la red de Aztec.
export async function deployToken(adminWallet, initialAdminBalance, logger) {
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
export async function mintTokensToPrivate(token, minterWallet, recipient, amount) {
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
    const initialSupply = 1000000n;
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
    const mintQuantity = 10000n;
    await mintTokensToPrivate(tokenContractBob, bobWallet, bob, mintQuantity);
    // Check the new balances
    aliceBalance = await tokenContractAlice.methods.balance_of_private(alice).simulate();
    logger.info(`Alice's balance ${aliceBalance}`);
    bobBalance = await tokenContractBob.methods.balance_of_private(bob).simulate();
    logger.info(`Bob's balance ${bobBalance}`);
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDekUsT0FBTyxFQUlILFlBQVksRUFDWixlQUFlLEVBQ2YsVUFBVSxHQUNiLE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFHOUIscURBQXFEO0FBQ3JELE1BQU0sQ0FBQyxLQUFLLFVBQVUsV0FBVyxDQUFDLFdBQW1CLEVBQUUsbUJBQTJCLEVBQUUsTUFBYztJQUM5RixNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDM0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxhQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDN0csSUFBSSxFQUFFO1NBQ04sUUFBUSxFQUFFLENBQUM7SUFFaEIsSUFBSSxtQkFBbUIsR0FBRyxFQUFFLEVBQUUsQ0FBQztRQUMzQiwwRkFBMEY7UUFDMUYsTUFBTSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFFcEMsT0FBTyxRQUFRLENBQUM7QUFDcEIsQ0FBQztBQUVELDZEQUE2RDtBQUM3RCxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUNyQyxLQUFvQixFQUNwQixZQUFvQixFQUNwQixTQUF1QixFQUN2QixNQUFjO0lBRWQsTUFBTSxhQUFhLEdBQUcsTUFBTSxhQUFh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