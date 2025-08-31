use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ethers::{
    prelude::*,
    signers::Signer,
    core::types::U256,
};

// Import the `console.log` function from the `console` module of `web_sys`
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Define a macro to make logging easier
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

mod wallet;
mod crypto;
mod biometric;
mod types;
mod utils;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[derive(Serialize, Deserialize)]
pub struct WalletInfo {
    pub address: String,
    pub balance: String,
    pub private_key: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TransactionRequest {
    pub to: String,
    pub amount: String,
    pub gas_price: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct BiometricResult {
    pub success: bool,
    pub error: Option<String>,
}

#[wasm_bindgen]
pub fn init() {
    console_error_panic_hook::set_once();
    console_log!("Verox WASM initialized");
}

#[wasm_bindgen]
pub fn create_wallet() -> String {
    console_log!("Creating new wallet...");
    
    // Generate a new wallet
    let wallet_result = std::panic::catch_unwind(|| {
        let mut rng = rand::thread_rng();
        let secret = ethers::core::k256::SecretKey::random(&mut rng);
        let wallet = ethers::signers::LocalWallet::from(secret);
        
        let address = wallet.address();
        let private_key_hex = format!("0x{}", hex::encode(wallet.signer().to_bytes()));
        
        WalletInfo {
            address: address.to_string(),
            balance: "0.0".to_string(),
            private_key: Some(private_key_hex),
        }
    });
    
    match wallet_result {
        Ok(wallet_info) => {
            console_log!("Wallet created successfully: {}", wallet_info.address);
            serde_json::to_string(&wallet_info).unwrap_or_else(|_| "{}".to_string())
        }
        Err(_) => {
            console_log!("Failed to create wallet");
            serde_json::to_string(&WalletInfo {
                address: "".to_string(),
                balance: "0.0".to_string(),
                private_key: None,
            }).unwrap_or_else(|_| "{}".to_string())
        }
    }
}

#[wasm_bindgen]
pub fn verify_biometric() -> String {
    console_log!("Verifying biometric authentication...");
    
    // For now, return a mock result since biometric verification
    // in WASM requires different implementation
    let result = BiometricResult {
        success: true,
        error: None,
    };
    
    console_log!("Biometric verification completed");
    serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
}

#[wasm_bindgen]
pub fn get_wallet_balance(address: &str) -> String {
    console_log!("Getting wallet balance for: {}", address);
    
    // This would typically query the blockchain
    // For now, return a mock balance
    let wallet_info = WalletInfo {
        address: address.to_string(),
        balance: "0.5234".to_string(),
        private_key: None,
    };
    
    serde_json::to_string(&wallet_info).unwrap_or_else(|_| "{}".to_string())
}

#[wasm_bindgen]
pub fn prepare_transaction(transaction_json: &str) -> String {
    console_log!("Preparing transaction: {}", transaction_json);
    
    let transaction_request: Result<TransactionRequest, _> = serde_json::from_str(transaction_json);
    
    match transaction_request {
        Ok(tx_req) => {
            console_log!("Transaction prepared for {} ETH to {}", tx_req.amount, tx_req.to);
            
            // Return a mock transaction hash
            let mut result = HashMap::new();
            result.insert("success".to_string(), serde_json::Value::Bool(true));
            result.insert("tx_hash".to_string(), serde_json::Value::String("0x1234567890abcdef...".to_string()));
            result.insert("status".to_string(), serde_json::Value::String("prepared".to_string()));
            
            serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
        }
        Err(e) => {
            console_log!("Failed to parse transaction: {}", e);
            
            let mut result = HashMap::new();
            result.insert("success".to_string(), serde_json::Value::Bool(false));
            result.insert("error".to_string(), serde_json::Value::String(e.to_string()));
            
            serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
        }
    }
}

#[wasm_bindgen]
pub fn get_gas_price() -> String {
    console_log!("Getting current gas price...");
    
    // Mock gas price data
    let mut result = HashMap::new();
    result.insert("gas_price".to_string(), serde_json::Value::String("25 gwei".to_string()));
    result.insert("timestamp".to_string(), serde_json::Value::Number(serde_json::Number::from(1234567890)));
    
    serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
}
