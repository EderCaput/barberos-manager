-- Schema para BarberOS - Fast Data Entry (Uso Interno)

-- Tabela: clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    historico TEXT, -- Histórico simplificado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: profissionais
CREATE TABLE IF NOT EXISTS profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    comissao_servico DECIMAL(5,2) NOT NULL DEFAULT 50.00, -- Ex: 50.00%
    comissao_produto DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- Ex: 10.00%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cliente UUID NOT NULL REFERENCES clientes(id),
    id_profissional UUID NOT NULL REFERENCES profissionais(id),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    servico TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'confirmed', 'cancelado', 'concluido')),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: transacoes_pdv
CREATE TABLE IF NOT EXISTS transacoes_pdv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_agendamento UUID REFERENCES agendamentos(id), -- Opcional se for só venda balcão
    id_profissional UUID REFERENCES profissionais(id),
    valor_total DECIMAL(10,2) NOT NULL,
    descontos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('dinheiro', 'cartao', 'pix')),
    comissao_servico DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    comissao_produto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_comissao DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    itens_vendidos JSONB NOT NULL DEFAULT '[]'::jsonb, -- Ex: [{ id_produto, qtd, preco }]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: movimentacao_caixa
CREATE TABLE IF NOT EXISTS movimentacao_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_operador UUID NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('abertura', 'sangria', 'suprimento', 'fechamento')),
    valor DECIMAL(10,2) NOT NULL,
    observacao TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
