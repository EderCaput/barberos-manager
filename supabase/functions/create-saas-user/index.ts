// @ts-nocheck
// Ignora os alertas do VS Code, pois este arquivo roda no ambiente Deno (Supabase Edge) e não no Node.js
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ["edercaput@gmail.com", "atratusbpo@gmail.com"];

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Não autorizado." }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Cria cliente admin com service_role (poder total)
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Verifica que quem chama é o admin autorizado
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

        // Garante que apenas o admin pode chamar esta função
        if (!ADMIN_EMAILS.includes(callerUser.email?.trim().toLowerCase() || '')) {
            return new Response(JSON.stringify({ error: "Apenas o administrador pode criar contas SaaS." }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { email, password, nome_barbearia, dono, telefone, status, valor_assinatura } = await req.json();

        if (!email || !password || !nome_barbearia) {
            return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, nome_barbearia." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Busca o user_id do admin para gravar em assinantes
        const { data: adminUser } = await supabaseAdmin.auth.admin.getUserByEmail(callerUser.email!);
        const adminUserId = adminUser?.user?.id ?? callerUser.id;

        // Cria o usuário Auth para a barbearia sem precisar de confirmação de email
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const newUserId = newUser.user?.id;

        // Insere na tabela assinantes com user_id = admin (edercaput@gmail.com)
        const { error: insertError } = await supabaseAdmin.from("assinantes").insert({
            nome_barbearia: nome_barbearia.trim(),
            dono: dono?.trim() || null,
            email: email.trim(),
            telefone: telefone?.trim() || null,
            status: status || "ativo",
            valor_assinatura: parseFloat(valor_assinatura) || 55.00,
            user_id: adminUserId,   // sempre o edercaput@gmail.com
            auth_user_id: newUserId, // ID da barbearia criada para referência
        });

        if (insertError) {
            // Rollback: remove o Auth user se o insert falhar
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
