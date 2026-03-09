const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AdminSecurity.tsx', 'utf8');

// Insert handleToggle function
content = content.replace("const handleThreatWipe = () => {", `const handleToggle = async (key: string, label: string, isChecked: boolean, setter: Function) => {
        setter(isChecked);
        supabase.from('admin_security_settings').upsert({ key_name: key, is_active: isChecked }).then();
        
        toast(isChecked ? \`\${label} LIGADO\` : \`\${label} DESLIGADO\`, {
            description: isChecked ? 'Sistemas vitais operando com autorização master.' : 'Blindagem recolhida. Risco elevado no ambiente.',
            style: { 
                backgroundColor: isChecked ? '#064e3b' : '#7f1d1d', 
                color: '#fff', 
                border: \`1px solid \${isChecked ? '#10b981' : '#ef4444'}\`
            }
        });
        playNotificationSound();
    };

    const handleThreatWipe = () => {`);

// Add missing autoRotateTokens to the manual mass-save payload under Acessos if necessary
if (content.includes('key_name: \'auto_rotate\'') === false) {
    content = content.replace(
        "{ key_name: 'jwt_strict', is_active: jwtStrict }",
        "{ key_name: 'jwt_strict', is_active: jwtStrict },\n                { key_name: 'auto_rotate', is_active: autoRotateTokens }"
    );
}

// Replaces component checked changes
content = content.replace('onCheckedChange={setBiometricsLogin}', "onCheckedChange={(c) => handleToggle('bio_login', 'Biometria de Login', c, setBiometricsLogin)}");
content = content.replace('onCheckedChange={setBiometricsWithdraw}', "onCheckedChange={(c) => handleToggle('bio_withdraw', 'Biometria 1º Saque', c, setBiometricsWithdraw)}");
content = content.replace('onCheckedChange={setFacialWithdraw}', "onCheckedChange={(c) => handleToggle('face_withdraw', 'FaceID de Saque', c, setFacialWithdraw)}");
content = content.replace('onCheckedChange={setAutoRotateTokens}', "onCheckedChange={(c) => handleToggle('auto_rotate', 'Rotação JWT 15m', c, setAutoRotateTokens)}");
content = content.replace('onCheckedChange={setJwtStrict}', "onCheckedChange={(c) => handleToggle('jwt_strict', 'Strict-Bind JWT', c, setJwtStrict)}");

content = content.replace('onCheckedChange={setAntiCheatGuile}', "onCheckedChange={(c) => handleToggle('anti_guile', 'Anti-Guile Hook', c, setAntiCheatGuile)}");
content = content.replace('onCheckedChange={setAntiCheatKingrow}', "onCheckedChange={(c) => handleToggle('anti_kingrow', 'Anti-Kingrow Clicker', c, setAntiCheatKingrow)}");
content = content.replace('onCheckedChange={setDeviceFingerprinting}', "onCheckedChange={(c) => handleToggle('device_fp', 'DNA de Hardware', c, setDeviceFingerprinting)}");
content = content.replace('onCheckedChange={setGeoFencing}', "onCheckedChange={(c) => handleToggle('geo_fencing', 'Radar e Geo-Fencing', c, setGeoFencing)}");
content = content.replace('onCheckedChange={setAntiChipDumping}', "onCheckedChange={(c) => handleToggle('anti_dump', 'Escudo Chip-Dumping', c, setAntiChipDumping)}");

content = content.replace('onCheckedChange={setEncryptTransactions}', "onCheckedChange={(c) => handleToggle('encrypt_tx', 'Cripto transacional', c, setEncryptTransactions)}");
content = content.replace('onCheckedChange={setRateLimiter}', "onCheckedChange={(c) => handleToggle('rate_limiter', 'Rate-Limiter', c, setRateLimiter)}");
content = content.replace('onCheckedChange={setImmutableLedger}', "onCheckedChange={(c) => handleToggle('immutable_ledger', 'Ledger Intocável', c, setImmutableLedger)}");

fs.writeFileSync('src/components/admin/AdminSecurity.tsx', content);
