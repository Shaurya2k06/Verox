export default async function init(input){
  if (typeof input === 'string') {
    await fetch(input); // placeholder fetch
  }
}
export function create_wallet(secret){
  return { address: '0xPLACEHOLDER'+secret.slice(0,6), encrypted: 'enc:'+secret };
}
export function decrypt_wallet(encrypted, secret){
  if (!encrypted.endsWith(secret)) throw new Error('Bad secret');
  return { address: '0xPLACEHOLDER'+secret.slice(0,6) };
}
