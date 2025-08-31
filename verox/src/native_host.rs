use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{self, Write, Read};
use ethers::{
    prelude::*,
    signers::Signer,
};

mod wallet;
mod crypto;
mod biometric;
mod types;
mod utils;

#[derive(Serialize, Deserialize)]
struct NativeMessage {
    action: String,
    data: Option<Value>,
}

#[derive(Serialize, Deserialize)]
struct NativeResponse {
    success: bool,
    data: Option<Value>,
    error: Option<String>,
}

fn main() {
    let _stdin = io::stdin();
    let stdout = io::stdout();
    
    loop {
        // Read message length (first 4 bytes)
        let mut length_bytes = [0u8; 4];
        if io::stdin().read_exact(&mut length_bytes).is_err() {
            break;
        }
        
        let message_length = u32::from_ne_bytes(length_bytes);
        
        // Read the actual message
        let mut buffer = vec![0u8; message_length as usize];
        if io::stdin().read_exact(&mut buffer).is_err() {
            break;
        }
        
        let message_str = String::from_utf8_lossy(&buffer);
        
        // Parse and handle the message
        let response = match serde_json::from_str::<NativeMessage>(&message_str) {
            Ok(message) => handle_message(message),
            Err(e) => NativeResponse {
                success: false,
                data: None,
                error: Some(format!("Failed to parse message: {}", e)),
            }
        };
        
        // Send response back
        let response_json = serde_json::to_string(&response).unwrap();
        let response_bytes = response_json.as_bytes();
        let response_length = (response_bytes.len() as u32).to_ne_bytes();
        
        let mut stdout_lock = stdout.lock();
        stdout_lock.write_all(&response_length).unwrap();
        stdout_lock.write_all(response_bytes).unwrap();
        stdout_lock.flush().unwrap();
    }
}

fn handle_message(message: NativeMessage) -> NativeResponse {
    match message.action.as_str() {
        "create_wallet" => handle_create_wallet(),
        "unlock_wallet" => handle_unlock_wallet(),
        "verify_biometric" => handle_verify_biometric(),
        "register_biometric" => handle_register_biometric(),
        "get_wallet_info" => handle_get_wallet_info(),
        "send_transaction" => handle_send_transaction(message.data),
        _ => NativeResponse {
            success: false,
            data: None,
            error: Some("Unknown action".to_string()),
        }
    }
}

fn handle_create_wallet() -> NativeResponse {
    // Use the existing wallet creation logic
    match std::panic::catch_unwind(|| {
        let mut rng = rand::thread_rng();
        let secret = ethers::core::k256::SecretKey::random(&mut rng);
        let wallet = ethers::signers::LocalWallet::from(secret);
        
        let address = wallet.address();
        let private_key_hex = format!("0x{}", hex::encode(wallet.signer().to_bytes()));
        
        serde_json::json!({
            "address": address.to_string(),
            "private_key": private_key_hex,
            "created_at": chrono::Utc::now().to_rfc3339()
        })
    }) {
        Ok(wallet_data) => NativeResponse {
            success: true,
            data: Some(wallet_data),
            error: None,
        },
        Err(_) => NativeResponse {
            success: false,
            data: None,
            error: Some("Failed to create wallet".to_string()),
        }
    }
}

fn handle_unlock_wallet() -> NativeResponse {
    // Try to find and unlock existing wallet
    match std::fs::read_dir("keystore") {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("dat") {
                        // Found a keystore file
                        return NativeResponse {
                            success: true,
                            data: Some(serde_json::json!({
                                "address": "0x742d35Cc6634C0532925a3b8d0b4E1b87D5E2d3c",
                                "unlocked": true
                            })),
                            error: None,
                        };
                    }
                }
            }
            
            NativeResponse {
                success: false,
                data: None,
                error: Some("No wallet found".to_string()),
            }
        }
        Err(_) => NativeResponse {
            success: false,
            data: None,
            error: Some("Keystore directory not found".to_string()),
        }
    }
}

fn handle_verify_biometric() -> NativeResponse {
    // For now, just return success with mock biometric verification
    NativeResponse {
        success: true,
        data: Some(serde_json::json!({
            "verified": true,
            "method": "Touch ID"
        })),
        error: None,
    }
}

fn handle_register_biometric() -> NativeResponse {
    // For now, just return success with mock biometric registration
    NativeResponse {
        success: true,
        data: Some(serde_json::json!({
            "registered": true,
            "method": "Touch ID"
        })),
        error: None,
    }
}

fn handle_get_wallet_info() -> NativeResponse {
    NativeResponse {
        success: true,
        data: Some(serde_json::json!({
            "address": "0x742d35Cc6634C0532925a3b8d0b4E1b87D5E2d3c",
            "balance": "0.5234",
            "network": "mainnet"
        })),
        error: None,
    }
}

fn handle_send_transaction(data: Option<Value>) -> NativeResponse {
    match data {
        Some(tx_data) => {
            // Parse transaction data
            let to = tx_data["to"].as_str().unwrap_or("");
            let amount = tx_data["amount"].as_str().unwrap_or("0");
            
            // Mock transaction sending
            NativeResponse {
                success: true,
                data: Some(serde_json::json!({
                    "tx_hash": "0x1234567890abcdef1234567890abcdef12345678",
                    "to": to,
                    "amount": amount,
                    "status": "pending"
                })),
                error: None,
            }
        }
        None => NativeResponse {
            success: false,
            data: None,
            error: Some("No transaction data provided".to_string()),
        }
    }
}
