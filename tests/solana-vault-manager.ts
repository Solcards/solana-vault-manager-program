import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaVaultManager } from "../target/types/solana_vault_manager";
import CreateToken from './utils/token';
import { assert } from "chai";

const { TOKEN_PROGRAM_ID, createTransferInstruction } = require('@solana/spl-token');

describe("solana-vault-manager", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const payer = anchor.web3.Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(
        require("fs").readFileSync(process.env.ANCHOR_WALLET, {
          encoding: "utf-8",
        })
      )
    )
  );
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaVaultManager as Program<SolanaVaultManager>;

  it("#create_vault", async () => {

    const token = await CreateToken({
        inputs: {
          connection: provider.connection,
          amount: 1000,
        },
        accounts: {
          payerSign: payer,
          payer: payer.publicKey,
        },
    });

    const [player] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'), 
        anchor.web3.Keypair.generate().publicKey.toBuffer(), 
        Buffer.from('player'),
        anchor.web3.Keypair.generate().publicKey.toBuffer()
      ], 
      program.programId
    );
    
    const seed = player.toBuffer();
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [seed], 
      program.programId
    );

    const [vaultToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), vault.toBuffer()], 
      program.programId
    );
    
    await program.methods.createVault(seed).accounts({
      vault,
      mint: token.accounts.mint,
      owner: provider.wallet.publicKey,
      vaultToken: vaultToken
    }).rpc();


    assert.equal(
      (await provider.connection.getTokenAccountBalance(vaultToken)).value.amount,
      '0',
      'vaultToken balance should be 0'
    );

    assert.equal(
      (await provider.connection.getTokenAccountBalance(token.accounts.payerMintAccount)).value.amount,
      '1000',
      'payer balance should be 1000;'
    );
  });

  it("#withdraw", async () => {

    const INIT_AMOUNT = 1000;
    const token = await CreateToken({
        inputs: {
          connection: provider.connection,
          amount: INIT_AMOUNT,
        },
        accounts: {
          payerSign: payer,
          payer: payer.publicKey,
        },
    });

    const [player] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'), 
        anchor.web3.Keypair.generate().publicKey.toBuffer(), 
        Buffer.from('player'),
        anchor.web3.Keypair.generate().publicKey.toBuffer()
      ], 
      program.programId
    );
    
    const seed = player.toBuffer();
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [seed], 
      program.programId
    );

    const [vaultToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), vault.toBuffer()], 
      program.programId
    );
    
    await program.methods.createVault(seed).accounts({
      vault,
      mint: token.accounts.mint,
      owner: provider.wallet.publicKey,
      vaultToken: vaultToken
    }).rpc();

    // transfer funds to vault

    const transaction = new anchor.web3.Transaction();
    transaction.add(
      createTransferInstruction(
        token.accounts.payerMintAccount,
        vaultToken,
        provider.wallet.publicKey,
        INIT_AMOUNT,
        TOKEN_PROGRAM_ID
      )
    );

    transaction.feePayer = provider.wallet.publicKey;
    transaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    
    await anchor.web3.sendAndConfirmTransaction(provider.connection, transaction, [
      payer,
    ]);

    assert.equal(
      (await provider.connection.getTokenAccountBalance(vaultToken)).value.amount,
      '1000',
      'vaultToken balance should be 1000;'
    );

    assert.equal(
      (await provider.connection.getTokenAccountBalance(token.accounts.payerMintAccount)).value.amount,
      '0',
      'payer balance should be 0;'
    );

    await program.methods.withdrawVault(new anchor.BN(1000)).accounts({
      vault,
      mint: token.accounts.mint,
      owner: provider.wallet.publicKey,
      vaultToken: vaultToken,
      destination: token.accounts.payerMintAccount
    }).rpc();

    assert.equal(
      (await provider.connection.getTokenAccountBalance(vaultToken)).value.amount,
      '0',
      'vaultToken balance should be 0'
    );

    assert.equal(
      (await provider.connection.getTokenAccountBalance(token.accounts.payerMintAccount)).value.amount,
      '1000',
      'payer balance should be 1000'
    );
  });
});
