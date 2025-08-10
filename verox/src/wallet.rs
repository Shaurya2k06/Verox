use ethers::signers::{LocalWallet, Signer};
use ethers::core::k256::SecretKey;
use rand::thread_rng;
use std::fs;
use std::io::{self, Write};
use std::path::Path;
use hex;
use rpassword::read_password;
use serde_json::json;

use crate::crypto::{encrypt_keystore, decrypt_keystore};

/// Generate and store a new Ethereum wallet (encrypted with passphrase)
pub fn init_wallet() {
    println!("Generating a new Ethereum wallet...");

    let mut rng = thread_rng();
    let secret = SecretKey::random(&mut rng);
    let wallet = LocalWallet::from(secret);

    let address = wallet.address();
    let private_key_hex = format!("0x{}", hex::encode(wallet.signer().to_bytes()));

    println!("New wallet created!");
    println!("Address: {}", address);
    println!("Private Key: {}", private_key_hex);

    print!("Enter passphrase to encrypt wallet: ");
    io::stdout().flush().unwrap();
    let mut passphrase = String::new();
    io::stdin().read_line(&mut passphrase).unwrap();
    let passphrase = passphrase.trim();

    let keystore = json!({
        "address": address.to_string(),
        "private_key": private_key_hex,
    });

    let json = serde_json::to_string_pretty(&keystore).unwrap();
    let encrypted_bytes = encrypt_keystore(json.as_bytes(), passphrase.as_bytes());

    fs::create_dir_all("keystore").unwrap();
    // filename contains the address so multiple wallets are supported
    let filename = format!("keystore/{}.dat", address);
    fs::write(&filename, &encrypted_bytes).expect("Failed to write keystore file");

    println!("Keystore saved to: {}", filename);
}

/// Unlock and load the wallet (finds first .dat in keystore/)
pub fn unlock_wallet() {
    let keystore_dir = Path::new("keystore");

    if !keystore_dir.exists() {
        eprintln!("No keystore directory found. Run `verox init` first.");
        return;
    }

    // Find the first `.dat` file in the keystore folder
    let wallet_file = match fs::read_dir(keystore_dir)
        .expect("Failed to read keystore directory")
        .find_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.extension()?.to_str()? == "dat" {
                Some(path)
            } else {
                None
            }
        })
    {
        Some(path) => path,
        None => {
            eprintln!("No wallet file found in keystore directory.");
            return;
        }
    };

    print!("Enter passphrase: ");
    io::stdout().flush().unwrap();
    let passphrase = read_password().expect("Failed to read passphrase");

    let encrypted_data = fs::read(&wallet_file).expect("Failed to read wallet file");
    let decrypted_bytes = decrypt_keystore(&encrypted_data, passphrase.as_bytes());

    let keystore_json = String::from_utf8(decrypted_bytes)
        .expect("Invalid UTF-8 in decrypted wallet");

    // Parse JSON and load private key
    let parsed: serde_json::Value =
        serde_json::from_str(&keystore_json).expect("Invalid keystore JSON format");

    let private_key_hex = parsed["private_key"]
        .as_str()
        .expect("Private key missing in keystore");

    let wallet: LocalWallet = private_key_hex
        .parse()
        .expect("Failed to parse private key");

    println!("Wallet unlocked successfully!");
    println!("Address: {}", wallet.address());
}
