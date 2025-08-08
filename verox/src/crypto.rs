pub fn encrypt_keystore(data: &[u8], passphrase: &[u8]) -> Vec<u8> {
    // TODO: Replace with real encryption
    base64::encode(data).as_bytes().to_vec()
}

pub fn decrypt_keystore(data: &[u8], passphrase: &[u8]) -> Vec<u8> {
    // TODO: Replace with real decryption
    base64::decode(data).expect("Failed to decode base64")
}
