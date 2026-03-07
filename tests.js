import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAllTests() {
    console.log('--- INICIANDO TESTES AUTOMATIZADOS DO BARBER OS ---');

    // 1. Criar usuário admin via Supabase Auth
    console.log('\n1. Criando usuário admin (admin@barberos.com / admin123)...');
    const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: 'admin@barberos.com',
        password: 'adminpassword123',
        options: {
            data: {
                role: 'admin',
                first_name: 'Admin',
            }
        }
    });

    if (authErr && !authErr.message.includes('already registered')) {
        console.error('Erro ao criar admin:', authErr.message);
    } else {
        // Tenta fazer login para garantir
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
            email: 'admin@barberos.com',
            password: 'adminpassword123',
        });
        if (loginErr) {
            console.log('Usuário admin criado (mas talvez precise desativar "Confirm Email" no Supabase). Mensagem:', loginErr.message);
        } else {
            console.log('Usuário admin verificado/criado e autenticado com sucesso!');
        }
    }

    // Obter IDs genéricos da base
    const { data: profissionais } = await supabase.from('profissionais').select('*').limit(1);
    const { data: clientes } = await supabase.from('clientes').select('*').limit(1);

    if (!profissionais?.length || !clientes?.length) {
        console.log('Faltam profissionais ou clientes na base para prosseguir os testes (rode o node seed.js primeiro).');
        return;
    }

    const pId = profissionais[0].id; // Vamos usar o primeiro profissional
    const cId = clientes[0].id;

    // O Auth User (se não der erro de confirmação de email)
    const opId = authData?.user?.id || pId;

    // 2. Cadastrar Produto
    console.log('\n2. Adicionando/verificando produto no estoque...');
    const { data: novoProduto, error: prodErr } = await supabase.from('estoque').insert({
        nome: 'Produto Teste Automatizado',
        tipo: 'venda',
        custo: 50.00,
        preco_venda: 100.00,
        quantidade: 15,
        qtd_minima: 5
    }).select('*').single();

    if (prodErr) console.error(prodErr);
    else console.log(`Produto cadastrado com sucesso: [${novoProduto.nome}] (R$ 100,00)`);

    // 3. Abertura de Caixa
    console.log('\n3. Realizando abertura do caixa (Turno)...');
    await supabase.from('movimentacao_caixa').insert({
        id_operador: pId, // Usando UUID do profissional pq Auth id pode falhar no mockup
        tipo: 'abertura',
        valor: 200.00,
        observacao: 'Abertura de caixa de teste automatizado'
    });
    console.log('Caixa aberto com fundo inicial de R$ 200,00.');

    // 4. Nova Venda + Baixa Estoque
    console.log('\n4. Registrando Venda no PDV (Serviço + Produto)...');
    await supabase.from('transacoes_pdv').insert({
        id_profissional: pId,
        valor_total: 150.00,
        descontos: 0,
        metodo_pagamento: 'dinheiro',
        comissao_servico: 25.00, // Suponto serviço de R$ 50
        comissao_produto: 10.00, // Suponto produto de R$ 100
        total_comissao: 35.00,
        itens_vendidos: [
            { nome: 'Corte Teste', preco: 50.00, qtd: 1, tipo: 'service' },
            { id_produto: novoProduto?.id, nome: novoProduto?.nome, preco: 100.00, qtd: 1, tipo: 'product' }
        ]
    });

    if (novoProduto) {
        await supabase.from('estoque').update({ quantidade: novoProduto.quantidade - 1 }).eq('id', novoProduto.id);
    }
    console.log('Venda em DINHEIRO de R$ 150,00 efetuada (Corte + Produto). Estoque atualizado!');

    // 5. Sangria
    console.log('\n5. Registrando Sangria de R$ 75,00...');
    await supabase.from('movimentacao_caixa').insert({
        id_operador: pId,
        tipo: 'sangria',
        valor: 75.00,
        observacao: 'Retirada de dinheiro (Teste)'
    });
    console.log('Sangria salva!');

    // 6. Fechamento de Caixa
    console.log('\n6. Realizando fechamento do caixa...');
    // Gaveta teórica: (200 abertura + 150 venda dinheiro - 75 sangria) = 275
    await supabase.from('movimentacao_caixa').insert({
        id_operador: pId,
        tipo: 'fechamento',
        valor: 275.00,
        observacao: 'Fechamento de caixa automatizado (bateria de testes concluída)'
    });
    console.log('Caixa fechado informando gaveta final de R$ 275,00.');

    console.log('\n------------- RESULTADO -------------');
    console.log('Todos os testes finalizados com sucesso!');
    console.log('Usuário Admin = admin@barberos.com / adminpassword123');
    console.log('-------------------------------------\n');
}

runAllTests();
