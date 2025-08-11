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
        file: Option<String>,
    },
    /// Register biometric authentication (Touch ID)
    RegisterBiometric,
    /// Test biometric verification
    VerifyBiometric,
}

impl Cli {
    /// Creates a new CLI parser from arguments
    pub fn new() -> Self {
        Cli::parse()
    }

    /// Runs the CLI commands
    pub fn run(&self) {
        match &self.command {
            Commands::CreateWallet { passphrase: _ } => {
                println!("🔐 Creating wallet...");
                wallet::init_wallet();
            }
            Commands::UnlockWallet { file: _ } => {
                println!("🔓 Unlocking wallet...");
                // First try biometric verification
                match biometric::verify() {
                    Ok(true) => {
                        println!("✅ Biometric verification successful, unlocking wallet...");
                        wallet::unlock_wallet();
                    }
                    Ok(false) => {
                        println!("❌ Biometric verification failed");
                    }
                    Err(e) => {
                        println!("⚠️  Biometric verification error: {}", e);
                        println!("Falling back to manual unlock...");
                        wallet::unlock_wallet();
                    }
                }
            }
            Commands::RegisterBiometric => {
                match biometric::register() {
                    Ok(_) => println!("✅ Biometric authentication registered successfully!"),
                    Err(e) => println!("❌ Failed to register biometric authentication: {}", e),
                }
            }
            Commands::VerifyBiometric => {
                match biometric::verify() {
                    Ok(true) => println!("✅ Biometric verification successful!"),
                    Ok(false) => println!("❌ Biometric verification failed"),
                    Err(e) => println!("⚠️  Biometric verification error: {}", e),
                }
            }
        }
    }
}
