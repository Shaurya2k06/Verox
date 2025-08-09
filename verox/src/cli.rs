use clap::{Parser, Subcommand};

use crate::wallet;
use crate::biometric;

/// Command-line interface for Verox
#[derive(Parser, Debug)]
#[command(name = "Verox")]
#[command(about = "Biometric Wallet Locker CLI", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Create a new wallet
    CreateWallet {
        /// Optional passphrase for extra security
        #[arg(short, long)]
        passphrase: Option<String>,
    },
    /// Unlock an existing wallet
    UnlockWallet {
        /// Path to wallet file
        #[arg(short, long)]
        file: String,
    },
}

impl Cli {
    /// Creates a new CLI parser from arguments
    pub fn new() -> Self {
        Cli::parse()
    }

    /// Runs the CLI commands asynchronously
    pub async fn run(&self) {
        match &self.command {
            Commands::CreateWallet { passphrase } => {
                println!("🔐 Creating wallet...");
                wallet::create(passphrase.clone()).await;
            }
            Commands::UnlockWallet { file } => {
                println!("🔓 Unlocking wallet at: {}", file);
                wallet::unlock(file).await;
            }
        }
    }
}
