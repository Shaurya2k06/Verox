// WebAuthn helper functions for registration and authentication

export async function registerCredential(): Promise<ArrayBuffer | null> {
  if (!('credentials' in navigator)) throw new Error('WebAuthn not supported');
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Verox Wallet' },
    user: {
      id: crypto.getRandomValues(new Uint8Array(16)),
      name: 'user@verox',
      displayName: 'Verox User'
    },
    pubKeyCredParams: [ { type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 } ],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
    timeout: 60_000,
    attestation: 'none'
  };
  const credential = await navigator.credentials.create({ publicKey });
  if (!credential) return null;
  return (credential as PublicKeyCredential).rawId;
}

export async function authenticateCredential(credentialId: ArrayBuffer): Promise<boolean> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [ { id: credentialId, type: 'public-key', transports: ['internal'] } ],
    timeout: 60_000,
    userVerification: 'required'
  };
  const assertion = await navigator.credentials.get({ publicKey });
  return !!assertion;
}
