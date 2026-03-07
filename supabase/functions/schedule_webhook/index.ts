import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Tipos para garantir consistência
interface AgendamentoPayload {
  record: {
    id: string;
    id_cliente: string;
    id_profissional: string;
    data_hora: string;
    servico: string;
    status: string;
  };
  type: string; // 'INSERT', 'UPDATE'
}

Deno.serve(async (req) => {
  try {
    const payload: AgendamentoPayload = await req.json();

    // Filtra apenas novos agendamentos ou atualizações para "confirmed"
    if (payload.record.status !== "confirmed") {
      return new Response(JSON.stringify({ message: "Ignorado - status não confirmado" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Usando Deno para buscar variáveis de ambiente (URL do seu n8n/Antigravity webhook)
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL"); 
    
    if (!webhookUrl) {
        throw new Error("Webhook URL não configurada.");
    }

    // (Opcional) Aqui você poderia usar o supabase-js client para buscar os Nomes reais 
    // do Profissional e Cliente. Neste exemplo, enviaremos os IDs e os campos existentes no record.
    // Em um cenário completo, faria um fetch na tabela 'clientes' e 'profissionais'.
    
    // Formatação da data (Ex: "10/03 às 15:30") 
    const dataObj = new Date(payload.record.data_hora);
    const dia = dataObj.getDate().toString().padStart(2, '0');
    const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
    const hora = dataObj.getHours().toString().padStart(2, '0');
    const minuto = dataObj.getMinutes().toString().padStart(2, '0');
    
    const dataFeita = `${dia}/${mes} às ${hora}:${minuto}`;

    const jsonLimpo = {
      agendamento_id: payload.record.id,
      cliente_id: payload.record.id_cliente,
      profissional_id: payload.record.id_profissional,
      servico: payload.record.servico,
      data_formatada: dataFeita,
    };

    // Dispara para URL externa
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonLimpo),
    });

    if (!response.ok) {
        throw new Error(`Erro ao enviar para webhook. Status: ${response.status}`);
    }

    return new Response(
      JSON.stringify({ message: "Webhook disparado com sucesso", data: jsonLimpo }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error(err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
