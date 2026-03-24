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
    const [errorDetail, setErrorDetail] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({ title: 'Preencha todos os campos', variant: 'destructive' });
            return;
        }

        setLoading(true);
        setErrorDetail('');

        console.log('Tentando login:', email.trim(), '| senha len:', password.length);
        console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        console.log('Login resultado:', { data, error });

        if (error) {
            const detail = `[${error.status}] ${error.message}`;
            setErrorDetail(detail);
            toast({
                title: 'Falha no login',
                description: detail,
                variant: 'destructive',
            });
            setLoading(false);
        }
    };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'NAO DEFINIDO';

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
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

                    <form onSubmit={handleLogin} className="space-y-4 relative z-10" autoComplete="off">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">E-mail</label>
                            <Input
                                id="login-email-field"
                                type="text"
                                inputMode="email"
                                placeholder="exemplo@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-secondary/50 border-border h-12 px-4 focus:ring-primary/50"
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Senha</label>
                            <Input
                                id="login-password-field"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-secondary/50 border-border h-12 px-4 focus:ring-primary/50"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        {errorDetail && (
                            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 font-mono break-all">
                                {errorDetail}
                            </div>
                        )}

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

                    <p className="text-center text-xs text-muted-foreground/30 mt-4 font-mono">
                        {supabaseUrl.substring(8, 40)}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
