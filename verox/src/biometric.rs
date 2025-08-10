use std::fs;
use std::io::{self, Write};

pub struct BiometricAuth;

impl BiometricAuth {
    /// Register a new "biometric" (really a passphrase)
    pub fn register() -> io::Result<()> {
        println!("Registering Biometric...");
        print!("Set a secure passphrase: ");
        io::stdout().flush()?; 

        let mut passphrase = String::new();
        io::stdin().read_line(&mut passphrase)?;
        let passphrase = passphrase.trim();

        fs::write(".biometric_key", passphrase)?;
        println!("Biometric registered successfully.");
        Ok(())
    }

    /// Verify stored biometric (passphrase)
    pub fn verify() -> io::Result<bool> {
        println!("Verifying Biometric...");
        print!("Enter passphrase: ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        let input = input.trim();

        let stored = fs::read_to_string(".biometric_key")?
            .trim()
            .to_string();

        if input == stored {
            println!("Biometric Verified.");
            Ok(true)
        } else {
            println!("Verification failed.");
            Ok(false)
        }
    }
}
