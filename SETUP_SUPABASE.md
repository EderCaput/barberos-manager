# 🔧 SETUP DO SUPABASE — BarberOS

O projeto Supabase anterior foi deletado ou expirou. Siga estes passos para recriá-lo.

---

## PASSO 1 — Crie um novo projeto no Supabase

1. Acesse **https://supabase.com** e faça login (ou crie uma conta grátis)
2. Clique em **"New Project"**
3. Escolha uma organização, dê um nome (ex: `barberos-manager`) e defina uma senha forte
4. Clique em **"Create new project"** e aguarde ~2 minutos

---

## PASSO 2 — Copie as credenciais

No dashboard do projeto, vá em **Project Settings → API**:

- Copie a **Project URL** (ex: `https://xyzabc.supabase.co`)
- Copie a **anon public key** (começa com `eyJ...`)

---

## PASSO 3 — Atualize o arquivo `.env`

Abra o arquivo `.env` na raiz do projeto e substitua pelos novos valores:

```
VITE_SUPABASE_URL=https://SEU_NOVO_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...SUA_NOVA_CHAVE_ANON...
```

---

## PASSO 4 — Execute o banco de dados

No Supabase Dashboard, vá em **SQL Editor** e execute o SQL abaixo (cole tudo de uma vez):

```sql
-- ========================================
-- BARBEROS MANAGER — Schema Completo
-- ========================================

-- Tabela: clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    data_nascimento DATE,
    historico TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: profissionais
CREATE TABLE IF NOT EXISTS profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    comissao_servico DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    comissao_produto DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cliente UUID REFERENCES clientes(id),
    id_profissional UUID REFERENCES profissionais(id),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    servico TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'confirmed', 'cancelado', 'concluido')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: estoque
CREATE TABLE IF NOT EXISTS estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'uso_interno')),
    custo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantidade INT NOT NULL DEFAULT 0,
    qtd_minima INT NOT NULL DEFAULT 5,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: transacoes_pdv
CREATE TABLE IF NOT EXISTS transacoes_pdv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_agendamento UUID REFERENCES agendamentos(id),
    id_profissional UUID REFERENCES profissionais(id),
    valor_total DECIMAL(10,2) NOT NULL,
    descontos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('dinheiro', 'cartao', 'pix')),
    comissao_servico DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    comissao_produto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_comissao DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    itens_vendidos JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: movimentacao_caixa
CREATE TABLE IF NOT EXISTS movimentacao_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_operador UUID NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('abertura', 'sangria', 'suprimento', 'fechamento')),
    valor DECIMAL(10,2) NOT NULL,
    observacao TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: contas
CREATE TABLE IF NOT EXISTS contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
    tipo TEXT NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('despesa', 'receita')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: assinantes (admin SaaS)
CREATE TABLE IF NOT EXISTS assinantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_barbearia TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    plano TEXT NOT NULL DEFAULT 'basic',
    valor_mensalidade DECIMAL(10,2) NOT NULL DEFAULT 55.00,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- ROW LEVEL SECURITY (RLS) - Isolamento por usuário
-- ========================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_pdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinantes ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário só vê seus próprios dados
CREATE POLICY "Clientes por usuario" ON clientes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Profissionais por usuario" ON profissionais FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Agendamentos por usuario" ON agendamentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Estoque por usuario" ON estoque FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "PDV por usuario" ON transacoes_pdv FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Caixa por usuario" ON movimentacao_caixa FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Contas por usuario" ON contas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Assinantes: apenas o admin edercaput@gmail.com tem acesso
CREATE POLICY "Apenas admin acessa assinantes" ON assinantes
FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'edercaput@gmail.com' LIMIT 1)
) WITH CHECK (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'edercaput@gmail.com' LIMIT 1)
);
```

---

## PASSO 5 — Crie o usuário admin

1. No Supabase Dashboard → **Authentication → Users**
2. Clique em **"Add user"** → **"Create new user"**
3. Email: `edercaput@gmail.com`
4. Senha: escolha uma senha segura
5. Marque **"Auto Confirm User"** para não precisar confirmar por email

---

## PASSO 6 — Reinicie o app

Com o `.env` atualizado, o app deve funcionar completamente:

```bash
npm run dev
```

Acesse `http://localhost:8080` e faça login com `edercaput@gmail.com` e a senha que você criou.
