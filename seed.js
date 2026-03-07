import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const professionals = [
    { nome: 'Carlos Silva', comissao_servico: 50, comissao_produto: 10 },
    { nome: 'André Oliveira', comissao_servico: 45, comissao_produto: 10 },
    { nome: 'Rafael Costa', comissao_servico: 50, comissao_produto: 15 },
    { nome: 'Bruno Santos', comissao_servico: 40, comissao_produto: 10 },
];

const clientes = [
    { nome: 'João Mendes', whatsapp: '(11) 99876-5432', historico: 'Frequente' },
    { nome: 'Pedro Alves', whatsapp: '(11) 98765-4321', historico: 'Novo' },
];

const estoque = [
    { nome: 'Pomada Matte', tipo: 'venda', custo: 18, preco_venda: 45, quantidade: 24, qtd_minima: 5 },
    { nome: 'Óleo para Barba', tipo: 'venda', custo: 22, preco_venda: 55, quantidade: 15, qtd_minima: 5 },
    { nome: 'Corte Masculino (Serviço)', tipo: 'uso_interno', custo: 0, preco_venda: 45, quantidade: 999, qtd_minima: 0 },
    { nome: 'Barba Completa (Serviço)', tipo: 'uso_interno', custo: 0, preco_venda: 35, quantidade: 999, qtd_minima: 0 },
];

async function seed() {
    console.log('Inserindo profissionais...');
    for (const p of professionals) {
        const { error } = await supabase.from('profissionais').insert(p);
        if (error) console.log('Erro ao inserir profissional', error);
    }

    console.log('Inserindo clientes...');
    for (const c of clientes) {
        const { error } = await supabase.from('clientes').insert(c);
        if (error) console.log('Erro ao inserir cliente', error);
    }

    console.log('Inserindo estoque/serviços...');
    for (const e of estoque) {
        const { error } = await supabase.from('estoque').insert(e);
        if (error) console.log('Erro ao inserir estoque', error);
    }

    console.log('Seed finalizado!');
}

seed();
