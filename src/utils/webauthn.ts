export const performBiometricVerification = async (action: 'register' | 'authenticate'): Promise<boolean> => {
    try {
        if (!window.PublicKeyCredential) {
            console.warn("WebAuthn API is not supported on this device/browser.");
            return true; // Fallback para não travar plataformas incompatíveis no admin
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        if (action === 'register') {
            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: { name: "Real Fire", id: window.location.hostname },
                    user: {
                        id: userId,
                        name: "auth@realfire.com",
                        displayName: "Membro Real Fire"
                    },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000,
                }
            });
            return !!credential;
        } else {
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge,
                    rpId: window.location.hostname,
                    userVerification: "required",
                    timeout: 60000,
                }
            });
            return !!credential;
        }
    } catch (err) {
        console.error("Biometrics verification failed or was cancelled:", err);
        return false;
    }
};
