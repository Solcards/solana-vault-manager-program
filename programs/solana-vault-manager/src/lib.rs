use anchor_lang::prelude::*;

declare_id!("Ggcpkb5z4ZKseSnfJ3YbCZ9UnLeiiUmEcu6K89xdqaU9");

#[program]
pub mod solana_vault_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
