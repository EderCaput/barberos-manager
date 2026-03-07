-- MUDANDO PARA A ESTRUTURA SAAS MULTI-TENANT
-- 1. Adicionando a coluna `user_id` para identificar qual usuário/barbearia é dono daquele dado em TODAS as tabelas vitais do sistema.

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE transacoes_pdv ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE movimentacao_caixa ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE contas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE assinantes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Habilite o sistema Row Level Security (RLS) que isola lógicamente as tabelas por usuário logado.
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_pdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinantes ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Exclua regras de RLS antigas, caso existam, apenas por segurança:
DROP POLICY IF EXISTS "permitir_tudo_clientes" ON clientes;
DROP POLICY IF EXISTS "permitir_tudo_profissionais" ON profissionais;
DROP POLICY IF EXISTS "permitir_tudo_agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "permitir_tudo_estoque" ON estoque;
DROP POLICY IF EXISTS "permitir_tudo_pdv" ON transacoes_pdv;
DROP POLICY IF EXISTS "permitir_tudo_caixa" ON movimentacao_caixa;
DROP POLICY IF EXISTS "permitir_tudo_contas" ON contas;
DROP POLICY IF EXISTS "permitir_tudo_assinantes" ON assinantes;

-- 3. Criando as novas Políticas. A regra é ouro puro:
-- "Qualquer conta logada na barbearia SĆO pode acessar o que tiver o SEU user_id gravado."
-- O Supabase injeta o ID dinamicamente usando `auth.uid()` sem necessidade do React saber fazer contas.

-- Politicas para Clientes
CREATE POLICY "SaaS Clientes Isolados - Permite ALL" ON clientes
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Politicas para Profissionais
CREATE POLICY "SaaS Profissionais Isolados - Permite ALL" ON profissionais
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Politicas para Agendamentos
CREATE POLICY "SaaS Agendamentos Isolados - Permite ALL" ON agendamentos
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Politicas para Estoque e Servicos
CREATE POLICY "SaaS Estoque Isolados - Permite ALL" ON estoque
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Politicas para PDV
CREATE POLICY "SaaS Transacoes PDV Isoladas - Permite ALL" ON transacoes_pdv
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Politicas para Caixa
CREATE POLICY "SaaS Caixa Isolado - Permite ALL" ON movimentacao_caixa
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Politicas para Contas
CREATE POLICY "SaaS Contas Isoladas - Permite ALL" ON contas
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Politicas para Assinantes (Apenas um adendo: Admin enxergaria todos os SaaS, mas barbearias não deveriam nem ter/acessar este painel)
-- Para simplificar o MVP (Sua Conta é o sistema todo), faremos elas só verem "o seu pacote" logado se houver necessidade (Painel do cliente) e o SUPER_USER ter tudo,
-- mas por enquanto protegeremos a mesma forma por segurança local:
CREATE POLICY "SaaS Assinantes Isolados - Permite ALL" ON assinantes
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SE A SUA TABELA JÁ TIVER DADOS ANTERIOS de teste sem user_id eles VÃO SUMIR da tela após você rodar isso, porque o Supabase vai bloquear a leitura deles sem dono vinculado!
-- É normal para essa migração de sistema. Limpe tudo sem dono rodando: (cuidado se houver produção, mas assumimos testes até então)
-- DELETE FROM transacoes_pdv WHERE user_id IS NULL;
-- DELETE FROM agendamentos WHERE user_id IS NULL;
-- DELETE FROM clientes WHERE user_id IS NULL; 
-- e etc...

