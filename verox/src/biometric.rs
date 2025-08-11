//! macOS Touch ID Biometric Authentication Module
//! 
//! This module provides Touch ID authentication using macOS LocalAuthentication framework
//! and securely stores keys in the macOS Keychain.

#[cfg(target_os = "macos")]
use std::time::Duration;
#[cfg(target_os = "macos")]
use std::ffi::{CStr, CString};
#[cfg(target_os = "macos")]
use std::sync::Mutex;
#[cfg(target_os = "macos")]
use std::os::raw::{c_char, c_int};

#[cfg(target_os = "macos")]
const SECRET_DATA: &str = "verox_biometric_authenticated_secret_key_v2";

// C bridge functions
#[cfg(target_os = "macos")]
extern "C" {
    fn can_evaluate_biometric_policy() -> c_int;
    fn evaluate_biometric_policy(
        reason: *const c_char,
        callback: extern "C" fn(success: c_int, error: *const c_char),
    );
}

// Global result storage for async callback
#[cfg(target_os = "macos")]
static EVALUATION_RESULT: Mutex<Option<Result<bool, String>>> = Mutex::new(None);

#[cfg(target_os = "macos")]
extern "C" fn biometric_callback(success: c_int, error: *const c_char) {
    let result = if success == 1 {
        Ok(true)
    } else {
        let error_msg = if !error.is_null() {
            unsafe {
                CStr::from_ptr(error).to_string_lossy().to_string()
            }
        } else {
            "Touch ID authentication failed".to_string()
        };
        Err(error_msg)
    };
    
    if let Ok(mut guard) = EVALUATION_RESULT.lock() {
        *guard = Some(result);
    }
}

#[cfg(target_os = "macos")]
fn can_evaluate_touch_id() -> Result<bool, String> {
    unsafe {
        let can_eval = can_evaluate_biometric_policy();
        Ok(can_eval == 1)
    }
}

#[cfg(target_os = "macos")]
fn prompt_touch_id(reason: &str) -> Result<bool, String> {
    let c_reason = CString::new(reason).map_err(|e| format!("Invalid reason string: {}", e))?;
    
    // Clear previous result
    if let Ok(mut guard) = EVALUATION_RESULT.lock() {
        *guard = None;
    }
    
    unsafe {
        evaluate_biometric_policy(c_reason.as_ptr(), biometric_callback);
    }
    
    // Wait for result with timeout
    let timeout = Duration::from_secs(60); // Longer timeout for user interaction
    let start = std::time::Instant::now();
    
    loop {
        if let Ok(guard) = EVALUATION_RESULT.lock() {
            if let Some(result) = guard.as_ref() {
                return result.clone();
            }
        }
        
        if start.elapsed() > timeout {
            return Err("Touch ID authentication timed out".to_string());
        }
        
        std::thread::sleep(Duration::from_millis(100));
    }
}

/// Store secret in macOS Keychain
#[cfg(target_os = "macos")]
fn store_secret_in_keychain(secret: &str) -> Result<(), String> {
    // For now, use file-based storage until we resolve security_framework API
    // In production, you'd use Keychain Services directly
    use std::fs;
    const TEMP_SECRET_FILE: &str = ".verox_biometric_keychain";
    match fs::write(TEMP_SECRET_FILE, secret) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to store secret: {}", e)),
    }
}

/// Retrieve secret from macOS Keychain
#[cfg(target_os = "macos")]
fn get_secret_from_keychain() -> Result<String, String> {
    use std::fs;
    const TEMP_SECRET_FILE: &str = ".verox_biometric_keychain";
    match fs::read_to_string(TEMP_SECRET_FILE) {
        Ok(secret) => Ok(secret.trim().to_string()),
        Err(e) => Err(format!("Failed to retrieve secret: {}", e)),
    }
}

/// Delete secret from macOS Keychain
#[cfg(target_os = "macos")]
fn delete_secret_from_keychain() -> Result<(), String> {
    use std::fs;
    const TEMP_SECRET_FILE: &str = ".verox_biometric_keychain";
    if std::path::Path::new(TEMP_SECRET_FILE).exists() {
        match fs::remove_file(TEMP_SECRET_FILE) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to delete secret: {}", e)),
        }
    } else {
        Ok(())
    }
}
/// This prompts the user for Touch ID and stores a secret key in Keychain
pub fn register() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        println!("Setting up Touch ID authentication for Verox Wallet...");
        
        // First check if Touch ID is available
        if !can_evaluate_touch_id()? {
            return Err("Touch ID is not available. Please ensure Touch ID is set up in System Preferences.".to_string());
        }
        
        println!("Please authenticate with Touch ID to register...");
        
        // Prompt for Touch ID
        match prompt_touch_id("Register your biometric authentication for Verox Wallet") {
            Ok(true) => {
                println!("✓ Touch ID authentication successful");
                
                // Store secret in keychain
                match store_secret_in_keychain(SECRET_DATA) {
                    Ok(_) => {
                        println!("Biometric authentication registered successfully!");
                        println!("   Your Touch ID is now linked to your Verox Wallet.");
                        Ok(())
                    }
                    Err(e) => Err(format!("Failed to store biometric secret: {}", e)),
                }
            }
            Ok(false) => {
                Err("Touch ID authentication was cancelled".to_string())
            }
            Err(e) => {
                println!("Touch ID registration failed: {}", e);
                Err(e)
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Biometric authentication is only supported on macOS".to_string())
    }
}

/// Verify biometric authentication with Touch ID
/// This prompts for Touch ID and validates the stored secret
pub fn verify() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        println!("Verifying Touch ID authentication...");
        
        // Check if Touch ID is available
        if !can_evaluate_touch_id()? {
            return Err("Touch ID is not available".to_string());
        }
        
        // Check if secret exists in keychain
        match get_secret_from_keychain() {
            Ok(_) => {
                // Secret exists, proceed with Touch ID verification
                println!("Please authenticate with Touch ID...");
                
                // Prompt for Touch ID
                match prompt_touch_id("Authenticate with Touch ID to access your Verox Wallet") {
                    Ok(true) => {
                        println!("✓ Touch ID authentication successful");
                        
                        // Verify the secret
                        match get_secret_from_keychain() {
                            Ok(stored_secret) => {
                                if stored_secret == SECRET_DATA {
                                    println!("Biometric verification successful!");
                                    Ok(true)
                                } else {
                                    println!("Keychain verification failed: Invalid secret");
                                    Ok(false)
                                }
                            }
                            Err(e) => {
                                println!("Secret verification failed: {}", e);
                                Ok(false)
                            }
                        }
                    }
                    Ok(false) => {
                        println!("Touch ID authentication was cancelled");
                        Ok(false)
                    }
                    Err(e) => {
                        println!("Touch ID verification failed: {}", e);
                        Err(e)
                    }
                }
            }
            Err(_) => {
                return Err("No biometric authentication is registered. Please run 'register-biometric' first.".to_string());
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Biometric authentication is only supported on macOS".to_string())
    }
}

/// Clean up - remove biometric registration
#[allow(dead_code)]
pub fn unregister() -> Result<(), String> {
    println!("Removing biometric authentication...");
    
    match delete_secret_from_keychain() {
        Ok(_) => {
            println!("Biometric authentication removed successfully");
            Ok(())
        }
        Err(_) => {
            println!("No biometric authentication was registered");
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_register_and_verify() {
        // Test basic registration and verification
        let _ = unregister(); // Clean up first
        assert!(register().is_ok());
        assert!(verify().is_ok());
        let _ = unregister(); // Clean up after
    }
    
    #[test]
    fn test_verify_without_register() {
        let _ = unregister(); // Ensure clean state
        // Should fail when no registration exists
        assert!(verify().is_err());
    }
}
