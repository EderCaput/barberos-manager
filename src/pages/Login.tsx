import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scissors, LogIn, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({ title: 'Preencha todos os campos', variant: 'destructive' });
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            let msg = 'Erro ao fazer login. Verifique suas credenciais.';
            if (error.message.includes('Email not confirmed')) {
                msg = 'O e-mail não foi confirmado. Confirme seu e-mail no Supabase.';
            } else if (error.message.includes('Invalid login credentials')) {
                msg = 'E-mail ou senha incorretos.';
            }
            toast({ title: 'Acesso negado', description: msg, variant: 'destructive' });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full mix-blend-screen" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="z-10 w-full max-w-md"
            >
                <div className="glass-card p-8 border-glass-border relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />

                    <div className="text-center mb-8 relative z-10">
                        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            <Scissors className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">BarberOS</h1>
                        <p className="text-sm text-muted-foreground">O sistema definitivo para sua barbearia.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">E-mail</label>
                            <Input
                                type="email"
                                placeholder="exemplo@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-secondary/50 border-border h-12 px-4 focus:ring-primary/50"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Senha</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-secondary/50 border-border h-12 px-4 focus:ring-primary/50"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 mt-6 text-base font-medium transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <LogIn className="w-5 h-5 mr-2" />
                            )}
                            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
                        </Button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
