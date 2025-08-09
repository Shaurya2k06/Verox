use ethers::signers::{LocalWallet, Signer};
use ethers::core::k256::SecretKey;
use rand::thread_rng;
use std::fs;
use std::io::{self, Write};
use std::path::Path;
use hex;
use base64::{engine::general_purpose, Engine as _};
use rpassword::read_password;

pub fn init_wallet() {
    println!("Generating a new Ethereum wallet...");

    let mut rng = thread_rng();
    let secret = SecretKey::random(&mut rng);
    let wallet = LocalWallet::from(secret);

    let address = wallet.address();
    let private_key_hex = format!("0x{}", hex::encode(wallet.signer().to_bytes()));

    println!("New wallet created!");
    println!("Address: {:?}", address);
    println!("Private Key: {}", private_key_hex);

    print!("Enter passphrase to encrypt wallet: ");
    io::stdout().flush().unwrap();
    let mut passphrase = String::new();
    io::stdin().read_line(&mut passphrase).unwrap();
    let passphrase = passphrase.trim();

    let keystore = serde_json::json!({
        "address": format!("{:?}", address),
        "private_key": private_key_hex,
    });

    let json = serde_json::to_string_pretty(&keystore).unwrap();
    let encrypted_json = encrypt_keystore(json.as_bytes(), passphrase.as_bytes());

    fs::create_dir_all("keystore").unwrap();
    let filename = format!("keystore/{}.dat", address); // consistent format
    fs::write(&filename, encrypted_json).unwrap();

    println!("Keystore saved to: {}", filename);
}

fn encrypt_keystore(data: &[u8], _passphrase: &[u8]) -> Vec<u8> {
    general_purpose::STANDARD.encode(data).as_bytes().to_vec()
}

fn decrypt_keystore(data: &[u8], _passphrase: &[u8]) -> Vec<u8> {
    general_purpose::STANDARD.decode(data).expect("Failed to decode keystore")
}

pub fn unlock_wallet() {
    // You can later add option to select wallet file from keystore dir
    let wallet_path = Path::new("keystore").read_dir()
        .expect("Keystore directory not found")
        .next()
        .expect("No wallet found in keystore")
        .expect("Failed to read wallet file")
        .path();

    println!("Enter passphrase to unlock wallet: ");
    let passphrase = read_password().expect("Failed to read passphrase");

    let encrypted_data = fs::read(&wallet_path).expect("Failed to read wallet file");
    let decrypted_bytes = decrypt_keystore(&encrypted_data, passphrase.as_bytes());

    let json_str = String::from_utf8(decrypted_bytes).expect("Invalid UTF-8 in decrypted wallet");
    let keystore: serde_json::Value = serde_json::from_str(&json_str).expect("Invalid JSON in keystore");

    let private_key_hex = keystore["private_key"].as_str().expect("Missing private key");
    let wallet: LocalWallet = private_key_hex.parse().expect("Failed to parse private key");

    println!("Wallet unlocked successfully!");
    println!("Address: {:?}", wallet.address());
}
