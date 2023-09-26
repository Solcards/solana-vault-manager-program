use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Ggcpkb5z4ZKseSnfJ3YbCZ9UnLeiiUmEcu6K89xdqaU9");

#[program]
pub mod solana_vault_manager {
    use super::*;

    pub fn create_vault(ctx: Context<CreateVaultContext>, seed_vault: Vec<u8>) -> Result<()> {
        ctx.accounts.vault.owner = ctx.accounts.owner.key();
        ctx.accounts.vault.mint = ctx.accounts.mint.key();
        ctx.accounts.vault.seed = seed_vault;
        ctx.accounts.vault.bump = *ctx.bumps.get("vault").unwrap();

        Ok(())
    }

    pub fn withdraw_vault(ctx: Context<TransferContext>, amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };

        let ctx_transfer =CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(
            ctx_transfer.with_signer(&[&&[
                ctx.accounts.vault.seed.as_slice(),
                &[ctx.accounts.vault.bump],
            ][..]]),
            amount,
        )?;
  
        Ok(())
    }
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub seed: Vec<u8>,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(seed_vault: Vec<u8>)]
pub struct CreateVaultContext<'info> {
    pub mint: Account<'info, Mint>,
    #[account(
        init, 
        payer = owner, 
        space = 8 + 32 + 32 + 1 + 4 + seed_vault.len(), 
        seeds = [seed_vault.as_slice()], 
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = owner,
        token::mint = mint,
        token::authority = vault,
        seeds = [ b"vault".as_ref(), vault.key().as_ref()],
        bump
    )]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct TransferContext<'info> {
    pub mint: Account<'info, Mint>,
    #[
        account(
            constraint = owner.key() == vault.owner,
            constraint = mint.key() == vault.mint
        )
    ]
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"vault".as_ref(), vault.key().as_ref()], bump)]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
