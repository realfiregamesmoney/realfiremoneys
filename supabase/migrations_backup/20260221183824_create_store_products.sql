CREATE TABLE public.store_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image text NOT NULL,
  link text NOT NULL,
  price text NOT NULL,
  featured boolean DEFAULT false,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active store_products" ON public.store_products
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage store_products" ON public.store_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

INSERT INTO public.store_products (name, image, link, price, featured, category) VALUES 
('PC Gamer White Aquário', 'https://i.ibb.co/prhhD853/Whats-App-Image-2026-02-10-at-18-50-04-1.jpg', 'https://mercadolivre.com/sec/2vRefqx', 'R$ 2.929', true, 'SETUP'),
('PC Gamer Arena Preto + Monitor 75Hz', 'https://i.ibb.co/FbJnY428/Whats-App-Image-2026-02-10-at-18-51-59.jpg', 'https://mercadolivre.com/sec/2Aq2MvL', 'R$ 1.900', true, 'SETUP'),
('Kit Mobilador Pro 4 em 1', 'https://i.ibb.co/bg9LWLk6/Whats-App-Image-2026-02-10-at-18-54-49.jpg', 'https://mercadolivre.com/sec/17EqsTR', 'R$ 113,87', false, 'MOBILE'),
('Kit Mochila Angelical + Estojo', 'https://i.ibb.co/S7WnyPH0/Whats-App-Image-2026-02-10-at-18-55-50.jpg', 'https://mercadolivre.com/sec/1z4ziNq', 'R$ 139,90', false, 'ACESSÓRIOS'),
('Luva de Dedo Gamer High Precision', 'https://i.ibb.co/RRcs7mj/Whats-App-Image-2026-02-10-at-18-57-10.jpg', 'https://mercadolivre.com/sec/2GyK9Sd', 'R$ 20,50', false, 'MOBILE'),
('Cooler Magnético (Efeito Gelo)', 'https://i.ibb.co/qMxxWQfT/Whats-App-Image-2026-02-10-at-18-58-42.jpg', 'https://mercadolivre.com/sec/1xfvSLn', 'R$ 52,54', true, 'MOBILE'),
('Cooler Gamer Clip (Turbo Fan)', 'https://i.ibb.co/VW0r5PPZ/Whats-App-Image-2026-02-10-at-18-59-53.jpg', 'https://mercadolivre.com/sec/2XsXAGR', 'R$ 66,04', false, 'MOBILE'),
('Garrafa Mestre (Edição Limitada)', 'https://i.ibb.co/WpVLFYvv/Whats-App-Image-2026-02-10-at-19-01-55.jpg', 'https://mercadolivre.com/sec/2mfrBDg', 'R$ 29,90', false, 'ACESSÓRIOS'),
('Gamepad Controller Ergonômico', 'https://i.ibb.co/Swj6VYyn/Whats-App-Image-2026-02-10-at-19-02-48.jpg', 'https://mercadolivre.com/sec/22cchND', 'R$ 55,00', false, 'MOBILE'),
('Kit Angelical Azul (Moletom/Calça)', 'https://i.ibb.co/gbrKqD7c/Whats-App-Image-2026-02-10-at-19-03-57.jpg', 'https://mercadolivre.com/sec/18Td1s8', 'R$ 151,97', false, 'ACESSÓRIOS'),
('Kit Mestre Vermelho (Exclusivo)', 'https://i.ibb.co/M5WjtY4G/Whats-App-Image-2026-02-10-at-19-04-42.jpg', 'https://mercadolivre.com/sec/18Td1s8', 'R$ 151,97', false, 'ACESSÓRIOS'),
('Kit Angelical White (Moletom/Calça)', 'https://i.ibb.co/XcJb3ZZ/Whats-App-Image-2026-02-10-at-19-05-33.jpg', 'https://mercadolivre.com/sec/18Td1s8', 'R$ 151,97', false, 'ACESSÓRIOS'),
('Luva Raposa', 'https://i.ibb.co/fVPSbH3x/Whats-App-Image-2026-02-10-at-19-06-21.jpg', 'https://mercadolivre.com/sec/2VFEAEY', 'R$ 57,24', false, 'MOBILE'),
('Kit Teclado Completo', 'https://i.ibb.co/7tRv75KP/Whats-App-Image-2026-02-10-at-19-07-21.jpg', 'https://mercadolivre.com/sec/2bdHvi5', 'R$ 130,00', false, 'SETUP'),
('Cooler com Display de Temperatura', 'https://i.ibb.co/1fTfX5pJ/Whats-App-Image-2026-02-10-at-19-08-04.jpg', 'https://mercadolivre.com/sec/2JNhXGZ', 'R$ 50,72', true, 'MOBILE'),
('Caneca Rumo ao Mestre', 'https://i.ibb.co/s9djfcRv/Whats-App-Image-2026-02-10-at-19-09-06.jpg', 'https://mercadolivre.com/sec/1S2Y8Z3', 'R$ 35,00', false, 'ACESSÓRIOS'),
('Kit Adaptador Mobile Elite RGB', 'https://i.ibb.co/CqcnCw1/Whats-App-Image-2026-02-10-at-19-09-44.jpg', 'https://mercadolivre.com/sec/2a2cKqD', 'R$ 175,99', false, 'MOBILE'),
('Luva de Dedo Gamer Precisão', 'https://i.ibb.co/5x66TmbJ/Whats-App-Image-2026-02-10-at-19-11-09.jpg', 'https://mercadolivre.com/sec/2dFukaz', 'R$ 73,88', false, 'MOBILE'),
('Teclado Mecânico Compacto Custom', 'https://i.ibb.co/m5sq3T9q/Whats-App-Image-2026-02-10-at-19-12-08.jpg', 'https://mercadolivre.com/sec/1ckrasj', 'R$ 313,17', true, 'SETUP'),
('Teclado Gamer Razer Cynosa', 'https://i.ibb.co/0R3cVX3b/Whats-App-Image-2026-02-10-at-19-13-48.jpg', 'https://mercadolivre.com/sec/2t5MgNf', 'R$ 357,59', false, 'SETUP'),
('Kit Gamer 3 em 1 Dragon War', 'https://i.ibb.co/jZybn0Pz/Whats-App-Image-2026-02-10-at-19-14-46.jpg', 'https://mercadolivre.com/sec/153mABF', 'R$ 153,59', false, 'SETUP'),
('Controle Bluetooth Mobile Pro', 'https://i.ibb.co/vCZbtYk2/Whats-App-Image-2026-02-10-at-19-16-00.jpg', 'https://mercadolivre.com/sec/2tjYbXE', 'R$ 78,00', false, 'MOBILE'),
('Adaptador Hub USB 3.0 (4 Portas)', 'https://i.ibb.co/hJRbmfn7/Whats-App-Image-2026-02-10-at-19-16-54.jpg', 'https://mercadolivre.com/sec/2JSknLx', 'R$ 74,10', false, 'MOBILE'),
('Controle Gamer Transparente RGB', 'https://i.ibb.co/KzmBJnDw/Whats-App-Image-2026-02-10-at-19-41-15.jpg', 'https://mercadolivre.com/sec/1oyKKwJ', 'R$ 269,99', true, 'MOBILE'),
('PC Gamer Arena (Processador I5)', 'https://i.ibb.co/ZpP7X8Tc/Whats-App-Image-2026-02-10-at-19-42-41.jpg', 'https://mercadolivre.com/sec/23GywDk', 'R$ 1.576', true, 'SETUP'),
('PC Gamer BRX (I5, 16GB, SSD 480GB)', 'https://i.ibb.co/20wzPmDR/Whats-App-Image-2026-02-10-at-19-43-51.jpg', 'https://mercadolivre.com/sec/2nsHbDo', 'R$ 2.102', true, 'SETUP'),
('Kit Periféricos Gamer Profissional', 'https://i.ibb.co/Ngcw3VV4/Whats-App-Image-2026-02-10-at-19-45-54.jpg', 'https://mercadolivre.com/sec/1EjpAFh', 'R$ 3.812', false, 'SETUP');

NOTIFY pgrst, 'reload schema';
