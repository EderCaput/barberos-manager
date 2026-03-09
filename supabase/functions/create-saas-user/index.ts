import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Valida que quem chamou está autenticado (é o admin logado)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Não autorizado." }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Cria o cliente supabase com a service_role key (poder total)
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 3. Verifica que quem chama é um usuário autenticado válido
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user: callerUser }, error: callerError } = await supabaseClient.auth.getUser();
        if (callerError || !callerUser) {
            return new Response(JSON.stringify({ error: "Token inválido." }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Lê o body da requisição
        const { email, password, nome_barbearia, dono, telefone, status, valor_assinatura } = await req.json();

        if (!email || !password || !nome_barbearia) {
            return new Response(JSON.stringify({ error: "Campos obrigatórios faltando: email, password, nome_barbearia." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 5. Cria o usuário Auth com service_role (sem precisar de confirmação de email)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // já confirma automaticamente - usuário pode logar na hora
        });

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const newUserId = newUser.user?.id;

        // 6. Insere na tabela assinantes com o user_id do ADMIN (dono do painel SaaS)
        //    e também salva o auth_user_id do novo cliente para referência futura
        const { error: insertError } = await supabaseAdmin.from("assinantes").insert({
            nome_barbearia: nome_barbearia.trim(),
            dono: dono?.trim() || null,
            email: email.trim(),
            telefone: telefone?.trim() || null,
            status: status || "ativo",
            valor_assinatura: parseFloat(valor_assinatura) || 55.00,
            user_id: callerUser.id,       // admin é o "dono" do registro no painel
            auth_user_id: newUserId,       // ID do novo usuário criado para o cliente acessar
        });

        if (insertError) {
            // Se falhou ao inserir, tenta remover o Auth user criado (rollback manual)
            if (newUserId) {
                await supabaseAdmin.auth.admin.deleteUser(newUserId);
            }
            return new Response(JSON.stringify({ error: `Erro ao salvar assinante: ${insertError.message}` }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(
            JSON.stringify({ success: true, message: "Conta criada com sucesso!", auth_user_id: newUserId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("Erro na Edge Function:", err);
        return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
