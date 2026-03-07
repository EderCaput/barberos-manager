-- Tabela: contas (Contas a Pagar e A Receber)
CREATE TABLE IF NOT EXISTS contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
