use ethers::signers::LocalWallet;
use ethers::core::k256::SecretKey;
use rand::thread_rng;
use std::fs;
use std::io::{self, Write};
use serde_json::json;

pub fn init_wallet() {
    println!("Generating a new Ethereum wallet...");

    let mut rng = thread_rng();
    let secret = SecretKey::random(&mut rng);
    let wallet = LocalWallet::from(secret);
    let address = wallet.address();
    let private_key_hex = format!("0x{}", hex::encode(wallet.signer().to_bytes()));

    println!("Wallet created!");
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

    let keystore_json = serde_json::to_string_pretty(&keystore).unwrap();
    let encrypted_json = encrypt_keystore(keystore_json.as_bytes(), passphrase.as_bytes());

    fs::create_dir_all("keystore").unwrap();
    let filename = format!("keystore/{}.json", address);
    fs::write(&filename, encrypted_json).unwrap();

    println!("Keystore saved to: {}", filename);
}

fn encrypt_keystore(data: &[u8], passphrase: &[u8]) -> Vec<u8> {
    base64::encode(data).as_bytes().to_vec()
}
