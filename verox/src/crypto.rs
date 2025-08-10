use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use argon2::Argon2;
use rand::rngs::OsRng;
use rand::RngCore;
use base64::{engine::general_purpose, Engine as _};

/// Parameters:
/// - salt: 16 bytes
/// - nonce: 12 bytes (AES-GCM)
/// Storage format (bytes, then base64-encoded): [salt(16) | nonce(12) | ciphertext(...)]
///
/// NOTE: This function returns base64-encoded bytes (Vec<u8>) so you can write them
/// directly to disk. Replace Argon2 params / memory with stricter ones in prod.
pub fn encrypt_keystore(data: &[u8], passphrase: &[u8]) -> Vec<u8> {
    // 1) generate salt
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);

    // 2) derive 32-byte key using Argon2id
    let mut key = [0u8; 32];
    let argon2 = Argon2::default();
    argon2
        .hash_password_into(passphrase, &salt, &mut key)
        .expect("Argon2 hashing failed");

    // 3) create AES-GCM cipher
    let cipher = Aes256Gcm::new(Key::from_slice(&key));

    // 4) generate nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 5) encrypt
    let ciphertext = cipher
        .encrypt(nonce, data)
        .expect("AES-GCM encryption failed");

    // 6) combine salt + nonce + ciphertext, then base64 encode
    let mut out: Vec<u8> = Vec::with_capacity(16 + 12 + ciphertext.len());
    out.extend_from_slice(&salt);
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);

    general_purpose::STANDARD.encode(out).into_bytes()
}

pub fn decrypt_keystore(encoded: &[u8], passphrase: &[u8]) -> Vec<u8> {
    // decode base64
    let combined = general_purpose::STANDARD
        .decode(encoded)
        .expect("Base64 decode failed");

    if combined.len() < 28 {
        panic!("Keystore corrupted or too small");
    }

    // split into salt | nonce | ciphertext
    let salt = &combined[0..16];
    let nonce_bytes = &combined[16..28];
    let ciphertext = &combined[28..];

    // derive key with same salt
    let mut key = [0u8; 32];
    let argon2 = Argon2::default();
    argon2
        .hash_password_into(passphrase, salt, &mut key)
        .expect("Argon2 hashing failed");

    let cipher = Aes256Gcm::new(Key::from_slice(&key));
    let nonce = Nonce::from_slice(nonce_bytes);

    // decrypt
    cipher
        .decrypt(nonce, ciphertext)
        .expect("AES-GCM decryption failed")
}
