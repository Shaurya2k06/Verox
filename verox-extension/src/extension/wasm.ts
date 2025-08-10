// WASM integration wrapper. Assumes wasm-bindgen output placed under /public/wasm/
// Build your Rust crate with wasm-pack or cargo + wasm-bindgen producing wallet.js & wallet_bg.wasm

let wasmMod: any | null = null;

export async function initWasm() {
  if (wasmMod) return wasmMod;
  // Using dynamic import so Vite copies the JS glue; adjust path if output differs
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const mod = await import('../../public/wasm/wallet.js');
  await mod.default(chrome.runtime.getURL('wasm/wallet_bg.wasm'));
  wasmMod = mod;
  return wasmMod;
}

export async function createWallet(secret: string): Promise<{ address: string; encrypted: string; }> {
  const m = await initWasm();
  return m.create_wallet(secret);
}

export async function decryptWallet(encrypted: string, secret: string): Promise<{ address: string; }> {
  const m = await initWasm();
  return m.decrypt_wallet(encrypted, secret);
}
