// ==========================================
// BarberOS - Core Business Logic Algorithms
// Focados em Fast Data Entry e Performance
// ==========================================

// --- Interfaces de Entidades ---
export interface ComissaoProfissional {
    comissao_servico: number; // Ex: 50 (50%)
    comissao_produto: number; // Ex: 10 (10%)
}

export interface ItemVendido {
    id_produto: string;
    qtd: number;
    preco_unitario: number;
}

export interface AgendamentoBase {
    id: string;
    id_profissional: string;
    servico: string;
    preco_servico: number; // Preço recuperado via BD
}

export interface MovimentacaoCaixa {
    tipo: 'abertura' | 'sangria' | 'suprimento' | 'fechamento';
    valor: number;
}

export interface VendaDia {
    metodo_pagamento: 'dinheiro' | 'cartao' | 'pix';
    valor_total: number;
}

export interface Estoque {
    id: string;
    nome: string;
    quantidade: number;
    qtd_minima: number;
}

export interface RegistroConsumo {
    id_produto: string;
    quantidade_consumida: number;
}

// ==========================================
// ALGORITMO 2: Motor de Split e Comissões
// ==========================================
export function calcularCheckout(
    agendamento: AgendamentoBase,
    profissional: ComissaoProfissional,
    itensAdicionais: ItemVendido[],
    metodoPagamento: 'dinheiro' | 'cartao' | 'pix'
) {
    try {
        let totalProdutos = 0;
        for (const item of itensAdicionais) {
            totalProdutos += item.qtd * item.preco_unitario;
        }

        const valorTotalCobrar = agendamento.preco_servico + totalProdutos;

        // Calcula Split (Comissões)
        const comissaoServicoCalc = agendamento.preco_servico * (profissional.comissao_servico / 100);
        const comissaoProdutoCalc = totalProdutos * (profissional.comissao_produto / 100);
        const comissaoLiquida = comissaoServicoCalc + comissaoProdutoCalc;

        // O JSON a ser salvo na tabela de `transacoes_pdv`
        return {
            sucesso: true,
            payloadTransacao: {
                id_agendamento: agendamento.id,
                id_profissional: agendamento.id_profissional,
                valor_total: valorTotalCobrar,
                metodo_pagamento: metodoPagamento,
                comissao_servico: parseFloat(comissaoServicoCalc.toFixed(2)),
                comissao_produto: parseFloat(comissaoProdutoCalc.toFixed(2)),
                total_comissao: parseFloat(comissaoLiquida.toFixed(2)),
                itens_vendidos: itensAdicionais,
            }
        };
    } catch (error) {
        console.error("Erro no cálculo do checkout:", error);
        return { sucesso: false, erro: "Falha ao calcular checkout" };
    }
}

// ==========================================
// ALGORITMO 3: Fechamento de Caixa e Conciliação
// ==========================================
export function fecharCaixa(
    saldoInformadoGaveta: number,
    movimentacoes: MovimentacaoCaixa[],
    vendasDoDia: VendaDia[]
) {
    try {
        let fundoCaixa = 0;
        let sangrias = 0;
        let suprimentos = 0;

        // Subtotaliza movimentações do operador
        for (const mov of movimentacoes) {
            if (mov.tipo === 'abertura') fundoCaixa += mov.valor;
            if (mov.tipo === 'sangria') sangrias += mov.valor;
            if (mov.tipo === 'suprimento') suprimentos += mov.valor;
        }

        let vendasDinheiro = 0;
        let faturamentoCartao = 0;
        let faturamentoPix = 0;

        // Subtotaliza as vendas PDV por método
        for (const venda of vendasDoDia) {
            if (venda.metodo_pagamento === 'dinheiro') vendasDinheiro += venda.valor_total;
            if (venda.metodo_pagamento === 'cartao') faturamentoCartao += venda.valor_total;
            if (venda.metodo_pagamento === 'pix') faturamentoPix += venda.valor_total;
        }

        // Saldo esperado em gaveta = Fundo inicial + Vendas Dinheiro - Sangrias + Suprimentos
        const saldoEsperadoGaveta = fundoCaixa + vendasDinheiro - sangrias + suprimentos;
        const diferencaCaixa = saldoInformadoGaveta - saldoEsperadoGaveta;

        return {
            sucesso: true,
            relatorio: {
                fundoCaixa,
                vendasDinheiro,
                sangrias,
                suprimentos,
                saldoEsperadoGaveta,
                saldoInformadoGaveta,
                diferencaCaixa,
                faturamentoCartao,
                faturamentoPix,
                faturamentoTotalGeral: vendasDinheiro + faturamentoCartao + faturamentoPix,
                conclusao: diferencaCaixa === 0 ? 'CAIXA BATEU' : (diferencaCaixa > 0 ? 'SOBRA DE CAIXA' : 'QUEBRA DE CAIXA')
            }
        };
    } catch (error) {
        console.error("Erro no fechamento de caixa:", error);
        return { sucesso: false, erro: "Falha processando as vendas do dia" };
    }
}

// ==========================================
// ALGORITMO 4: Inteligência de Estoque (Burn Rate)
// ==========================================
export function burnRatePredictor(
    estoqueAtual: Estoque[],
    consumoUltimos15Dias: RegistroConsumo[]
) {
    try {
        // Mapeia o consumo agregado por produto
        const consumoPorProduto: Record<string, number> = {};
        for (const reg of consumoUltimos15Dias) {
            consumoPorProduto[reg.id_produto] = (consumoPorProduto[reg.id_produto] || 0) + reg.quantidade_consumida;
        }

        const alertas = [];

        for (const item of estoqueAtual) {
            const consumoTotal15Dias = consumoPorProduto[item.id] || 0;
            const mediaDiaria = consumoTotal15Dias / 15;

            if (mediaDiaria > 0) {
                // Previsão matemática simples
                const diasRestantes = Math.floor(item.quantidade / mediaDiaria);

                // Se vai acabar na próxima semana
                if (diasRestantes <= 7) {
                    alertas.push({
                        id_produto: item.id,
                        nome: item.nome,
                        estoqueAtual: item.quantidade,
                        mediaDiaria: parseFloat(mediaDiaria.toFixed(2)),
                        diasParaZerar: diasRestantes,
                        urgencia: diasRestantes <= 2 ? 'CRÍTICO' : 'ATENÇÃO',
                        mensagem: `Acaba em ${diasRestantes} dias. (Consumo: ${mediaDiaria.toFixed(1)}/dia)`
                    });
                }
            } else if (item.quantidade <= item.qtd_minima) {
                // Atingiu o limite de segurança mesmo sem consumo recente
                alertas.push({
                    id_produto: item.id,
                    nome: item.nome,
                    estoqueAtual: item.quantidade,
                    mediaDiaria: 0,
                    diasParaZerar: -1, // desconhecido
                    urgencia: 'REPOSIÇÃO NECESSÁRIA',
                    mensagem: `Mínimo de segurança atingido (${item.qtd_minima}).`
                });
            }
        }

        return {
            sucesso: true,
            alertasEncontrados: alertas.length,
            alertas
        };
    } catch (error) {
        console.error("Erro na previsão de estoque:", error);
        return { sucesso: false, erro: "Falha ao calcular burn rate" };
    }
}
