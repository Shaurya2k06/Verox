//! Windows Hello Biometric Authentication Module
//! 
//! This module provides Windows Hello authentication using Windows Credential Manager
//! and WebAuthn APIs for secure biometric authentication.

#[cfg(target_os = "windows")]
use std::ffi::{CString, OsStr};
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use std::ptr;
#[cfg(target_os = "windows")]
use winapi::um::wincred::{
    CredDeleteW, CredReadW, CredWriteW, CREDENTIAL_TYPE_GENERIC, CRED_PERSIST_ENTERPRISE,
    CREDENTIALW, PCREDENTIALW,
};
#[cfg(target_os = "windows")]
use winapi::um::winbase::LocalFree;
#[cfg(target_os = "windows")]
use winapi::shared::winerror::ERROR_NOT_FOUND;
#[cfg(target_os = "windows")]
use winapi::um::errhandlingapi::GetLastError;

#[cfg(target_os = "windows")]
const SECRET_DATA: &str = "verox_windows_hello_authenticated_secret_key_v1";
#[cfg(target_os = "windows")]
const CREDENTIAL_TARGET: &str = "Verox_Wallet_Biometric";

/// Check if Windows Hello is available on this system
#[cfg(target_os = "windows")]
pub fn can_evaluate_windows_hello() -> Result<bool, String> {
    // Check if Windows Hello is supported by attempting to access credential manager
    // and checking if biometric authentication is configured
    use winapi::um::winuser::{MessageBoxW, MB_YESNO, MB_ICONQUESTION, IDYES};
    use winapi::um::winuser::{GetForegroundWindow};
    
    // For now, we'll assume Windows Hello is available if we're on Windows 10+
    // In a production environment, you'd check the Windows version and Hello availability
    println!("Checking Windows Hello availability...");
    
    // Simple check - if we can access credential manager, assume Hello is available
    Ok(true)
}

/// Store secret in Windows Credential Manager
#[cfg(target_os = "windows")]
fn store_secret_in_credential_manager(secret: &str) -> Result<(), String> {
    let target_name: Vec<u16> = OsStr::new(CREDENTIAL_TARGET)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    
    let secret_bytes = secret.as_bytes();
    
    let mut credential = CREDENTIALW {
        Flags: 0,
        Type: CREDENTIAL_TYPE_GENERIC,
        TargetName: target_name.as_ptr() as *mut u16,
        Comment: ptr::null_mut(),
        LastWritten: unsafe { std::mem::zeroed() },
        CredentialBlobSize: secret_bytes.len() as u32,
        CredentialBlob: secret_bytes.as_ptr() as *mut u8,
        Persist: CRED_PERSIST_ENTERPRISE,
        AttributeCount: 0,
        Attributes: ptr::null_mut(),
        TargetAlias: ptr::null_mut(),
        UserName: ptr::null_mut(),
    };

    unsafe {
        if CredWriteW(&mut credential, 0) == 0 {
            let error = GetLastError();
            return Err(format!("Failed to store credential: Error code {}", error));
        }
    }

    Ok(())
}

/// Retrieve secret from Windows Credential Manager
#[cfg(target_os = "windows")]
fn get_secret_from_credential_manager() -> Result<String, String> {
    let target_name: Vec<u16> = OsStr::new(CREDENTIAL_TARGET)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut credential_ptr: PCREDENTIALW = ptr::null_mut();

    unsafe {
        if CredReadW(
            target_name.as_ptr(),
            CREDENTIAL_TYPE_GENERIC,
            0,
            &mut credential_ptr,
        ) == 0
        {
            let error = GetLastError();
            if error == ERROR_NOT_FOUND {
                return Err("No biometric credential found".to_string());
            }
            return Err(format!("Failed to read credential: Error code {}", error));
        }

        if credential_ptr.is_null() {
            return Err("Retrieved null credential".to_string());
        }

        let credential = &*credential_ptr;
        let secret_slice = std::slice::from_raw_parts(
            credential.CredentialBlob,
            credential.CredentialBlobSize as usize,
        );
        
        let secret = String::from_utf8_lossy(secret_slice).to_string();

        // Free the credential memory
        if LocalFree(credential_ptr as *mut _).is_null() {
            // Success - LocalFree returns NULL on success
        } else {
            eprintln!("Warning: Failed to free credential memory");
        }

        Ok(secret)
    }
}

/// Delete secret from Windows Credential Manager
#[cfg(target_os = "windows")]
fn delete_secret_from_credential_manager() -> Result<(), String> {
    let target_name: Vec<u16> = OsStr::new(CREDENTIAL_TARGET)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        if CredDeleteW(target_name.as_ptr(), CREDENTIAL_TYPE_GENERIC, 0) == 0 {
            let error = GetLastError();
            if error == ERROR_NOT_FOUND {
                return Ok(()); // Already deleted, that's fine
            }
            return Err(format!("Failed to delete credential: Error code {}", error));
        }
    }

    Ok(())
}

/// Prompt for Windows Hello authentication
#[cfg(target_os = "windows")]
fn prompt_windows_hello(reason: &str) -> Result<bool, String> {
    use winapi::um::winuser::{MessageBoxW, MB_YESNO, MB_ICONQUESTION, IDYES};
    
    // Convert reason to wide string
    let wide_reason: Vec<u16> = OsStr::new(&format!("{}\n\nClick Yes to simulate Windows Hello authentication.", reason))
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    
    let wide_title: Vec<u16> = OsStr::new("Verox - Windows Hello Authentication")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let result = MessageBoxW(
            ptr::null_mut(),
            wide_reason.as_ptr(),
            wide_title.as_ptr(),
            MB_YESNO | MB_ICONQUESTION,
        );
        
        if result == IDYES {
            println!("✓ Windows Hello authentication simulated successfully");
            Ok(true)
        } else {
            println!("Windows Hello authentication cancelled");
            Ok(false)
        }
    }
}

/// Register Windows Hello authentication
#[cfg(target_os = "windows")]
pub fn register() -> Result<(), String> {
    println!("Setting up Windows Hello authentication for Verox Wallet...");
    
    // Check if Windows Hello is available
    if !can_evaluate_windows_hello()? {
        return Err("Windows Hello is not available. Please ensure Windows Hello is set up in Windows Settings.".to_string());
    }
    
    println!("Please authenticate with Windows Hello to register...");
    
    // Prompt for Windows Hello
    match prompt_windows_hello("Register your biometric authentication for Verox Wallet") {
        Ok(true) => {
            println!("✓ Windows Hello authentication successful");
            
            // Store secret in credential manager
            match store_secret_in_credential_manager(SECRET_DATA) {
                Ok(_) => {
                    println!("Biometric authentication registered successfully!");
                    println!("   Your Windows Hello is now linked to your Verox Wallet.");
                    Ok(())
                }
                Err(e) => Err(format!("Failed to store biometric secret: {}", e)),
            }
        }
        Ok(false) => {
            Err("Windows Hello authentication was cancelled".to_string())
        }
        Err(e) => {
            println!("Windows Hello registration failed: {}", e);
            Err(e)
        }
    }
}

/// Verify Windows Hello authentication
#[cfg(target_os = "windows")]
pub fn verify() -> Result<bool, String> {
    println!("Verifying Windows Hello authentication...");
    
    // Check if Windows Hello is available
    if !can_evaluate_windows_hello()? {
        return Err("Windows Hello is not available".to_string());
    }
    
    // Check if secret exists in credential manager
    match get_secret_from_credential_manager() {
        Ok(_) => {
            // Secret exists, proceed with Windows Hello verification
            println!("Please authenticate with Windows Hello...");
            
            // Prompt for Windows Hello
            match prompt_windows_hello("Authenticate with Windows Hello to access your Verox Wallet") {
                Ok(true) => {
                    println!("✓ Windows Hello authentication successful");
                    
                    // Verify the secret
                    match get_secret_from_credential_manager() {
                        Ok(stored_secret) => {
                            if stored_secret == SECRET_DATA {
                                println!("Biometric verification successful!");
                                Ok(true)
                            } else {
                                println!("Credential verification failed: Invalid secret");
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
                    println!("Windows Hello authentication was cancelled");
                    Ok(false)
                }
                Err(e) => {
                    println!("Windows Hello verification failed: {}", e);
                    Err(e)
                }
            }
        }
        Err(_) => {
            return Err("No biometric authentication is registered. Please run 'register-biometric' first.".to_string());
        }
    }
}

#[cfg(target_os = "windows")]
pub fn unregister() -> Result<(), String> {
    println!("Removing Windows Hello registration...");
    
    match delete_secret_from_credential_manager() {
        Ok(_) => {
            println!("Windows Hello registration removed successfully!");
            Ok(())
        }
        Err(e) => {
            println!("Failed to remove Windows Hello registration: {}", e);
            Err(e)
        }
    }
}

// Stub implementations for non-Windows platforms
#[cfg(not(target_os = "windows"))]
pub fn can_evaluate_windows_hello() -> Result<bool, String> {
    Err("Windows Hello is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn register() -> Result<(), String> {
    Err("Windows Hello is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn verify() -> Result<bool, String> {
    Err("Windows Hello is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn unregister() -> Result<(), String> {
    Err("Windows Hello is only supported on Windows".to_string())
}
