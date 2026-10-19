import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { toFrenchMessage } from '@/utils/errors';

const schema = z.object({
  email: z.string().min(1, "L'email est obligatoire.").email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { session, profile, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (!loading && session && profile && profile.role !== 'MEMBRE') return <Navigate to={from} replace />;

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate(from, { replace: true });
    } catch (e) {
      setFormError(toFrenchMessage(e, 'Connexion impossible. Veuillez réessayer.'));
    }
  };

  const input = 'mt-1.5 w-full rounded-lg border border-omda-borderGray bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-omda-green focus:ring-2 focus:ring-omda-green/20';

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-omda-forest p-12 text-white lg:flex">
        <img src="/omda-logo.png" alt="OMDA" className="h-14 w-14 rounded-xl bg-white p-1.5" />
        <div>
          <p className="text-4xl font-bold leading-tight">Office Malagasy<br />des Droits d'Auteur</p>
          <p className="mt-4 max-w-sm text-white/70">Suivez les adhésions, validez les œuvres et gardez un œil sur les paiements des créateurs.</p>
        </div>
        <span className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full border-[28px] border-omda-ochre/25" aria-hidden />
        <p className="relative text-sm text-white/50">Espace réservé au personnel</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm" noValidate>
          <img src="/omda-logo.png" alt="OMDA" className="mb-6 h-12 w-12 lg:hidden" />
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-omda-textGray">Réservée aux agents et administrateurs de l'OMDA.</p>

          <label className="mt-8 block text-sm font-medium">Email
            <input type="email" autoComplete="username" disabled={isSubmitting} className={`${input} disabled:bg-omda-warmGray disabled:text-omda-textGray`} {...register('email')} />
            {errors.email && <span className="mt-1 block text-xs font-normal text-omda-errorRed">{errors.email.message}</span>}
          </label>
          <label className="mt-4 block text-sm font-medium">Mot de passe
            <span className="relative block">
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" disabled={isSubmitting} className={`${input} pr-11 disabled:bg-omda-warmGray disabled:text-omda-textGray`} {...register('password')} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-[calc(50%+3px)] -translate-y-1/2 rounded p-1.5 text-omda-textGray hover:text-omda-black"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
            {errors.password && <span className="mt-1 block text-xs font-normal text-omda-errorRed">{errors.password.message}</span>}
          </label>

          {formError && <p role="alert" className="mt-4 rounded-lg bg-omda-errorRed/10 px-3 py-2 text-sm text-omda-errorRed">{formError}</p>}

          <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}
            className="relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-omda-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-omda-greenDark disabled:cursor-wait disabled:hover:bg-omda-green">
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Connexion en cours…</> : 'Se connecter'}
            {isSubmitting && <span className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/20" aria-hidden><span className="block h-full w-1/4 animate-progress rounded-full bg-omda-ochre" /></span>}
          </button>
        </form>
      </main>
    </div>
  );
}
