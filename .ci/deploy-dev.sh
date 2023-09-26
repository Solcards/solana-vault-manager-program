export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET='./id.json'
(solana airdrop 2 $(solana-keygen pubkey $ANCHOR_WALLET) --url https://api.devnet.solana.com && solana airdrop 2 $(solana-keygen pubkey $ANCHOR_WALLET) --url https://api.devnet.solana.com) || true

anchor build --provider.cluster devnet
anchor deploy --provider.cluster devnet
