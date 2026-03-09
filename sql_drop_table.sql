DROP TABLE IF EXISTS app_settings CASCADE;

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow all actions for admins" ON app_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

INSERT INTO app_settings (key, value) VALUES 
('parceria_cutoff', '10'),
('parceria_whatsapp', ''),
('parceria_ui_config', '{"mainBtnText":"Trabalhe com a Gente 🚀","mainBtnColor":"orange","cardReferralTitle":"Indique e Ganhe","cardReferralDesc":"Convide amigos através do seu link e ganhe dinheiro na hora para jogar assim que depositarem.","cardReferralColor":"purple","cardAffiliateTitle":"Afiliado de Produtos","cardAffiliateDesc":"Venda produtos digitais online com nossos links e receba alta comissão garantida. Nível Iniciante.","cardAffiliateColor":"blue","cardInfluencerTitle":"Mestre Influenciador","cardInfluencerDesc":"Teste de Aptidão: Apenas para criadores de conteúdo que tenham mais de 5.000 seguidores.","cardInfluencerColor":"orange"}'),
('parceria_affiliates', '[]'),
('parceria_questions', '[]');
