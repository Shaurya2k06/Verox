## Verox: Biometric Ethereum Wallet

Verox is a biometric wallet locker that works as a browser extension (Similar to Metamask), but with an extra layer of hardware backed security. Using WebAuthn and your device's built in biometric capibilities like Touch ID, Windows Hello or YubiKey, Verox securely stores and unlocks Ethereum Wallets without ever exposing private keys.

## Features
- **Biometric Authentication:** Face ID, Touch ID, Windows Hello, YubiKey
- **Rust-powered cryptography** via WebAssembly(WASM).
- **Secure Key Storage:** Private keys are never exposed to the browser.
- **Vite+Typescript** for a modern development experience.
- **WebAuthn Integration** for hardware-based key storage.
- **macOS Touch ID Integration:** Production-ready Touch ID authentication for wallet unlock

## Touch ID CLI (macOS Production)

The Rust CLI includes full production Touch ID integration for macOS users:

### Setup Touch ID Authentication
```bash
# Register your Touch ID for wallet access
cargo run -- register-biometric

# Verify Touch ID is working
cargo run -- verify-biometric

# Unlock wallet using Touch ID (falls back to passphrase if needed)
cargo run -- unlock-wallet
```

### Features:
- **Real Touch ID Prompts:** Uses macOS LocalAuthentication framework
- **Secure Storage:** Biometric secrets stored securely (with Keychain integration ready)
- **Smart Fallback:** Falls back to passphrase if Touch ID unavailable
- **Production Ready:** Built with Objective-C bridge for reliable macOS integration

### Requirements:
- macOS with Touch ID enabled
- Rust toolchain with macOS target
- Xcode command line tools

## Tech Stack 
| Layer          | Technology                     |
| -------------- | ------------------------------ |
| **Frontend**   | Vite + TypeScript + React      |
| **Crypto**     | Rust + WebAssembly (WASM)      |
| **Auth**       | WebAuthn API + Touch ID        |
| **Extension**  | Chrome / Firefox Extension API |
| **Blockchain** | ethers.js                      |
| **CLI**        | Rust + LocalAuthentication     |

## How it Works 
1. **Installation**: Users install the Verox browser extension from the Chrome Web Store or Firefox Add-ons.
2. **Setup**: On first run, Verox generates an Ethereum wallet inside the Rust WASM module. The private key is encrypted and stored inside the browser using WebAuthn credentials. 
3. **Unlocking**: When the user wants to sign a transaction, they authenticate with biometrics. WebAuthn verifies the identity and decrypts the key inside secure hardware. The signing process happens in Rust/WASM- the private key is never exposed to JS. 
4. **Using with Dapps**: Acts as an Ethereum wallet provider, compatible with standard EIP-1193 request methods. 

### Fido2: Open Authentication Standard

This project implements the FIDO2 Open Authentication Standard, which consists the usage of W3C Web Authentication Specification (WebAuthn) for secure and passwordless authentication. We also aim to apply the usage of CTAP (Client To Authenticatior Protocol).

#### Objectives
- **Passwordless Authentication** : Using hardware Authentication elimitates the need to for weak password based authentication.

- **2FA**: Strong two factor authentication as an extra layer of protection without a password.

