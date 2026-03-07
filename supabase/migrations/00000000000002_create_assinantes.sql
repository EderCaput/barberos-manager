CREATE TABLE IF NOT EXISTS assinantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_barbearia TEXT NOT NULL,
    dono TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    valor_assinatura DECIMAL(10,2) NOT NULL DEFAULT 55.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
