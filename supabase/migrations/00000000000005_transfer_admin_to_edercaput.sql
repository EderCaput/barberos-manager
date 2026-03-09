-- ============================================================
-- MIGRAÇÃO: Transfere o controle do sistema para edercaput@gmail.com
-- ============================================================

-- 1. Atualiza TODOS os registros da tabela assinantes para pertencer ao edercaput@gmail.com
--    (independente de qual user_id estava gravado antes)
UPDATE assinantes
SET user_id = (SELECT id FROM auth.users WHERE email = 'edercaput@gmail.com' LIMIT 1);

-- 2. Remove as políticas antigas de assinantes que dependiam do user_id variável
DROP POLICY IF EXISTS "SaaS Admin Enxerga Seus Assinantes" ON assinantes;
DROP POLICY IF EXISTS "SaaS Assinantes Isolados - Permite ALL" ON assinantes;

-- 3. Cria nova política SIMPLES: apenas o email do admin tem acesso à tabela assinantes
--    Não depende de user_id gravado — depende de QUEM está logado agora.
CREATE POLICY "Apenas edercaput acessa assinantes" ON assinantes
FOR ALL USING (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'edercaput@gmail.com' LIMIT 1)
) WITH CHECK (
    auth.uid() = (SELECT id FROM auth.users WHERE email = 'edercaput@gmail.com' LIMIT 1)
);

-- NOTA: Para remover outros usuários Auth (barbearias), faça manualmente no
-- Supabase Dashboard > Authentication > Users e delete os usuários que não são o admin.
-- Ou execute: DELETE FROM auth.users WHERE email != 'edercaput@gmail.com';
