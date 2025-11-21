export const biometricService = {
    isAvailable: async (): Promise<boolean> => {
        if (!window.PublicKeyCredential) return false;
        try {
            return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch {
            return false;
        }
    },

    register: async (username: string): Promise<boolean> => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge,
                rp: {
                    name: "Verox Wallet",
                    id: window.location.hostname,
                },
                user: {
                    id: Uint8Array.from(username, c => c.charCodeAt(0)),
                    name: username,
                    displayName: username,
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" }, // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                },
                timeout: 60000,
                attestation: "direct"
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            return !!credential;
        } catch (error) {
            console.error('Biometric registration failed:', error);
            return false;
        }
    },

    authenticate: async (): Promise<boolean> => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
                challenge,
                timeout: 60000,
                userVerification: "required",
            };

            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });

            return !!assertion;
        } catch (error) {
            console.error('Biometric authentication failed:', error);
            return false;
        }
    }
};
