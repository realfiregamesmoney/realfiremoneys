

# 🔥 Real Fire - PWA de Torneios Gaming

## Visão Geral
Plataforma mobile-first de torneios de Free Fire com sistema financeiro (carteira digital), loja de produtos gamer e painel administrativo. Visual dark gaming premium com acentos em laranja neon (#FF5500) e verde neon (#00FF00).

---

## Fase 1: Fundação & Identidade Visual

### Tema Dark Gaming
- Fundo preto profundo (#0a0a0a), cards com bordas sutis em laranja
- Fonte Rajdhani (Google Fonts) para títulos, sistema para textos
- Logo da Fênix na tela de login e header do dashboard
- Configuração PWA (manifest.json, service worker básico)

### Layout Base
- Header fixo com logo "REAL FIRE", sino de notificações e badge de saldo (R$)
- Barra de navegação inferior fixa: Dashboard, Torneios, Loja, Perfil
- Todas as telas mobile-first e responsivas

---

## Fase 2: Autenticação & Backend (Supabase)

### Tela de Login/Cadastro
- Tabs "ENTRAR" / "CRIAR CONTA" conforme mockup
- Campos Email + Senha com visual dark
- Botão "ENTRAR NA ARENA" laranja gradiente
- Link "Esqueceu a senha? Recuperar"

### Banco de Dados
- Tabela `profiles`: nickname, saldo, nivel, avatar_url
- Tabela `user_roles`: controle de admin separado (segurança)
- Tabela `tournaments`: título, valor entrada, prêmio, max_players, room_link, status, is_fixed
- Tabela `enrollments`: inscrições dos usuários em torneios
- Tabela `transactions`: depósitos/saques com status pending/approved/rejected
- RLS em todas as tabelas: usuários veem apenas seus dados

### Admin Supremo
- Email `realfiregamemoney@gmail.com` recebe role 'admin' via tabela `user_roles`
- Verificação server-side via função `has_role()`

---

## Fase 3: Dashboard

- Banner de torneio em destaque com prêmio e botão "INSCREVER-SE AGORA"
- Ticker horizontal de atividade recente (ganhos, depósitos)
- Botões rápidos: Depositar (Via PIX) e Sacar (Rápido)
- Ranking "TOP JOGADORES DA TEMPORADA" com avatar, nick e ganhos em verde
- Card "Suas Estatísticas": Torneios, Ganhos, Vitórias

---

## Fase 4: Sistema de Torneios

### Listagem de Torneios
- Cards com faixa colorida de entrada (R$ 1,00 a R$ 50,00+)
- Cada card mostra: tipo (Dupla/Squad/Solo), nome da sala, prêmio em verde, data/hora, contador de jogadores (ex: 0/50)

### Fluxo de Inscrição
1. Usuário clica "ENTRAR - R$ X,00"
2. Sistema verifica saldo → desconta valor da entrada
3. Cria registro em `enrollments`, incrementa `current_players`
4. **Link da sala aparece SOMENTE após inscrição confirmada**
5. Contador atualiza em tempo real via Supabase Realtime

### Sala Lotada / Fila de Espera
- Quando 50/50: texto muda para "Sala Lotada / Fila de Espera"
- Inscrição continua liberada (usuário entra na fila)

---

## Fase 5: Sistema Financeiro (Carteira)

### Depósito
- Tela com dados do PIX (chave/QR Code)
- Botão "Já Paguei" → cria transação com status `pending`
- Mensagem "Aguardando Aprovação do Admin"
- Saldo só atualiza quando admin aprova

### Saque
- Input de CPF + Valor desejado
- Cria transação `pending` para aprovação

### Histórico
- Lista de transações com status (pendente/aprovado/rejeitado)

---

## Fase 6: Loja

- Banner "Oferta do Dia" no topo
- Filtros: Todos / Destaques
- Grid 2 colunas com produtos gamer (headsets, controles, luvas, e-books, gift cards)
- Cada card: imagem, nome, preço em laranja, botão "COMPRAR" que abre link externo
- Produtos são dados estáticos (sem desconto do saldo)

---

## Fase 7: Perfil do Usuário

- Avatar com ícone de edição, nickname, ID Free Fire
- Badge de saldo atual em destaque
- Botão "PAINEL DO ADMIN" (visível apenas para admin)
- Ações rápidas: Depositar, Sacar, Histórico
- Card de estatísticas: Torneios, Vitórias, Ganhos
- Menu: Editar Perfil, Suas Inscrições, Configurações, Sugestão de Melhorias, Ajuda e Suporte, Sair da Conta

---

## Fase 8: Painel do Admin (Mission Control)

- Header "MISSION CONTROL - Sala de Comando"
- 4 abas: Torneios, Financeiro, Usuários, Suporte

### Aba Torneios
- Criar torneio: Nome, Valor, Data, Link da Sala
- Listar/editar torneios existentes
- Atualizar link de sala para torneios fixos/recorrentes

### Aba Financeiro
- Lista de depósitos/saques pendentes
- Botões "Aprovar" (atualiza saldo do usuário) e "Reprovar"

### Aba Usuários
- Lista com Nick, Email, Saldo de todos os usuários

### Aba Suporte
- Chat simples para responder tickets/mensagens dos usuários

