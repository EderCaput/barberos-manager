# ============================================================
# Script para criar as tabelas do BarberOS no Supabase
# Execute com: powershell -ExecutionPolicy Bypass -File criar_tabelas.ps1
# ============================================================

$PROJECT_REF = "xsaffdahamafglhkkyrz"

Write-Host "Para criar as tabelas automaticamente, precisamos do seu access token do Supabase."
Write-Host ""
Write-Host "1. Acesse: https://supabase.com/dashboard/account/tokens"
Write-Host "2. Clique em 'Generate new token'"
Write-Host "3. Cole aqui o token gerado:"
Write-Host ""
$TOKEN = Read-Host "Access Token"

$SQL = @"
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    data_nascimento DATE,
    historico TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    comissao_servico DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    comissao_produto DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
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
CREATE TABLE IF NOT EXISTS movimentacao_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_operador UUID NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('abertura', 'sangria', 'suprimento', 'fechamento')),
    valor DECIMAL(10,2) NOT NULL,
    observacao TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
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
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_pdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Clientes por usuario" ON clientes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Profissionais por usuario" ON profissionais FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Agendamentos por usuario" ON agendamentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Estoque por usuario" ON estoque FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "PDV por usuario" ON transacoes_pdv FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Caixa por usuario" ON movimentacao_caixa FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Contas por usuario" ON contas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Apenas admin acessa assinantes" ON assinantes FOR ALL USING (auth.uid() = (SELECT id FROM auth.users WHERE email = 'edercaput@gmail.com' LIMIT 1)) WITH CHECK (auth.uid() = (SELECT id FROM auth.users WHERE email = 'edercaput@gmail.com' LIMIT 1));
"@

$body = @{ query = $SQL } | ConvertTo-Json -Depth 5

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "Criando tabelas..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" `
        -Method POST `
        -Headers $headers `
        -Body $body

    Write-Host "SUCESSO! Tabelas criadas!" -ForegroundColor Green
    Write-Host $response
} catch {
    Write-Host "ERRO: $_" -ForegroundColor Red
    Write-Host "Resposta: $($_.Exception.Response)" -ForegroundColor Red
}
