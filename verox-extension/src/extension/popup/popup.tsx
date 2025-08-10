import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { registerCredential, authenticateCredential } from './webauthn';
import { createWallet, decryptWallet, initWasm } from '../wasm';

const WALLET_KEY = 'verox_wallet';
const CRED_KEY = 'verox_cred';

const Popup: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  async function handleCreate() {
    setLoading(true); setStatus('Registering credential...');
    try {
      await initWasm();
      const credId = await registerCredential();
      if (!credId) throw new Error('Credential registration failed');
      const credHex = Array.from(new Uint8Array(credId)).map(b=>b.toString(16).padStart(2,'0')).join('');
      setStatus('Creating wallet...');
      const wallet = await createWallet(credHex);
      await chrome.storage.local.set({ [WALLET_KEY]: wallet.encrypted, [CRED_KEY]: credHex });
      setAddress(wallet.address);
      setStatus('Wallet created');
    } catch(e:any){
      console.error(e); setStatus(e.message || 'Failed');
    } finally { setLoading(false); }
  }

  async function handleUnlock() {
    setLoading(true); setStatus('Authenticating...');
    chrome.storage.local.get([WALLET_KEY, CRED_KEY], async (res) => {
      try {
        const encrypted = res[WALLET_KEY];
        const credHex = res[CRED_KEY];
        if (!encrypted || !credHex) throw new Error('No wallet stored');
        const credId = new Uint8Array(credHex.match(/.{1,2}/g).map((b:string)=>parseInt(b,16))).buffer;
        const ok = await authenticateCredential(credId);
        if (!ok) throw new Error('Biometric auth failed');
        await initWasm();
        setStatus('Decrypting...');
        const wallet = await decryptWallet(encrypted, credHex);
        setAddress(wallet.address);
        setStatus('Unlocked');
      } catch(e:any){
        console.error(e); setStatus(e.message || 'Failed');
      } finally { setLoading(false); }
    });
  }

  return (
    <div className="p-4 w-72 text-center">
      <h1 className="text-lg font-semibold mb-4">Verox Wallet</h1>
      <div className="space-y-2">
        <button disabled={loading} onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded">Create Wallet</button>
        <button disabled={loading} onClick={handleUnlock} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded">Unlock with Biometrics</button>
      </div>
      {status && <p className="mt-3 text-xs text-gray-600">{status}</p>}
      {address && <div className="mt-4 text-left">
        <p className="text-xs font-medium">Address:</p>
        <p className="font-mono text-[10px] break-all">{address}</p>
      </div>}
      {loading && <div className="mt-2 text-xs animate-pulse">Processing...</div>}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<Popup />);
