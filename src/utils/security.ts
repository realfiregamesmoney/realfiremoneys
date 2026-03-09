// Módulo de Combate Geo-Fencing e Fingerprint Tracker
export const generateDeviceFingerprint = async (): Promise<string> => {
    // Coleta dados físicos e de software do dispositivo para gerar um hash "imutável"
    const nav = window.navigator;
    const screen = window.screen;

    // Configurações do ambiente
    const components = [
        nav.userAgent,
        nav.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!window.sessionStorage,
        !!window.localStorage,
        !!window.indexedDB,
        typeof window.openDatabase,
        nav.cpuClass || 'unknown',
        nav.platform,
        nav.doNotTrack || 'unknown',
        // Adiciona plugins se baseando de forma segura
        Array.from(nav.plugins || []).map(p => p.name).join(','),
        // Adiciona hardware concorrência
        nav.hardwareConcurrency || 'unknown',
        nav.deviceMemory || 'unknown', // Memoria RAM se disponível
    ];

    const fingerprintRaw = components.join('|||');

    // Hash simples usando crypto sutil (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintRaw);

    try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 32); // Retorna um hash forte de 32 chars
    } catch (e) {
        // Fallback caso a subtle api nao teja em contexto seguro local (http inves de https)
        return btoa(fingerprintRaw).substring(0, 32);
    }
};

export const checkGeoFencing = async (): Promise<{ isAllowed: boolean, reason?: string, ip?: string, country?: string }> => {
    try {
        // Usa IP-API (Free e rápido) para pegar as informações de Origem do Jogador
        // NOTA: Em produção pesada, isso deve correr dentro do Supabase Edge Functions
        const response = await fetch('http://ip-api.com/json/?fields=status,message,country,countryCode,proxy,hosting,query');
        const data = await response.json();

        if (data.status !== 'success') {
            console.warn("Falha ao rastrear a origem do jogador. Liberação provisória.");
            return { isAllowed: true };
        }

        // --- REGRAS DE COMBATE (GEO-FENCING E VPN BLACKLIST) ---

        // 1. Uso de VPN, Proxy ou Redes Tor / DataCenters AWS (Hosting)
        if (data.proxy || data.hosting) {
            return {
                isAllowed: false,
                reason: "Conexão Clandestina: VPN, Proxy ou Servidor DataCenter (AWS/Google) detectado.",
                ip: data.query,
                country: data.country
            };
        }

        // 2. Bloqueio Geográfico Específico (Por exemplo, bloquear China, Russia se a operação é só Brasil)
        const BLACKLISTED_COUNTRIES = ['CN', 'RU', 'KP']; // Exemplos de bloqueio
        if (BLACKLISTED_COUNTRIES.includes(data.countryCode)) {
            return {
                isAllowed: false,
                reason: `Região Bloqueada: Tráfego originário da região (${data.country}) não autorizado.`,
                ip: data.query,
                country: data.country
            };
        }

        return { isAllowed: true, ip: data.query, country: data.country };

    } catch (err) {
        console.error("Erro no Sistema de Geo-Radar", err);
        // Em caso de API fora, não bloquear legitimos. O Edge function deve ser o escudeiro final.
        return { isAllowed: true };
    }
};

// --- MÓDULO DE CRIPTOGRAFIA P-2-P CHAT ---
// Usando cifra simétrica de deslocamento combinada com Base64 para garantir velocidade Real-Time sem gargalar o Supabase.
const P2P_SECRET = "ARES_MILITARY_GRADE_KEY_XOR_999";

export const encryptMessageP2P = (text: string): string => {
    if (!text || text.startsWith('SYS_')) return text; // Ignora comandos de sistema do chat
    try {
        let encrypted = "";
        for (let i = 0; i < text.length; i++) {
            encrypted += String.fromCharCode(text.charCodeAt(i) ^ P2P_SECRET.charCodeAt(i % P2P_SECRET.length));
        }
        return "P2P:" + btoa(encodeURIComponent(encrypted));
    } catch (e) {
        return text;
    }
};

export const decryptMessageP2P = (hash: string): string => {
    if (!hash || !hash.startsWith('P2P:')) return hash;
    try {
        const raw = decodeURIComponent(atob(hash.substring(4)));
        let decrypted = "";
        for (let i = 0; i < raw.length; i++) {
            decrypted += String.fromCharCode(raw.charCodeAt(i) ^ P2P_SECRET.charCodeAt(i % P2P_SECRET.length));
        }
        return decrypted;
    } catch (e) {
        return "Mensagem Criptografada (Falha na chave P2P)";
    }
};
