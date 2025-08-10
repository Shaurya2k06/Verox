use std::io::{self,Write};
pub struct BiometricAuth {
    pub fun register() -> io::Result<()> {
        println!("Registerign Biometric");
        print!("Set a secure Passphrase");
        io::stdout().flush()?;
        let mut passphrase= String::new();
        io::stdin().read_line(&mut passphrase)?;
        let passphrase = passphrase.trim();

        std::fs::write(".biometric_key", passphrase)?;
        println!("Biometric registered");
        Ok(())
    }
    pub fn verify() -> io::Result<bool> {
        println!("Verifying Biomentric...");
        print!("Enter Passphrase:");
        io::stdout().flush()?;
        let mut input - String::new();
        io::stdin().read_line(&mut input)?;
        let input = input.trim();
        let stored = std::ds::read_to_string(".biometric_key")?.trim().to_string();
        if input == stored {
            println!("Biometric Verified.");
            OK(true)

        } else {
            println!("Verification failed");
            Ok(false)
        }
    }
}