-- CORREÇÃO: Torna a coluna 'dono' opcional (era NOT NULL e quebrava o insert quando deixado vazio)
ALTER TABLE assinantes ALTER COLUMN dono DROP NOT NULL;

-- NOVO: Adiciona coluna para guardar o ID de autenticação do cliente/barbearia criada
ALTER TABLE assinantes ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- CORREÇÃO DA POLÍTICA RLS DE ASSINANTES:
-- A política anterior bloqueava o admin de ver todos os assinantes.
-- Agora: o admin (dono dos registros via user_id) enxerga TODOS os seus assinantes.
-- A lógica correta: quem inseriu (admin) tem user_id = seu auth.uid().

DROP POLICY IF EXISTS "SaaS Assinantes Isolados - Permite ALL" ON assinantes;

-- Nova política: O admin enxerga todos os assinantes que ele cadastrou (user_id = seu id)
CREATE POLICY "SaaS Admin Enxerga Seus Assinantes" ON assinantes
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comentário explicativo:
-- auth_user_id = ID do usuário Auth criado para o CLIENTE (a barbearia) usar para logar
-- user_id = ID do ADMIN que gerencia o painel SaaS (dono do registro)
