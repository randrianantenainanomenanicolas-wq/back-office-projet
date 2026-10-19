import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Users } from 'lucide-react';
import Card, { InfoGrid } from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import Field, { inputClass } from '@/components/forms/Field';
import { useAuth } from '@/features/auth/AuthContext';
import { changePassword, updateOwnPhone } from '@/services/auth.service';
import { toFrenchMessage } from '@/utils/errors';
import { passwordStrength } from '@/utils/password';
import { formatDateTime } from '@/utils/format';
import { roleLabels, utilisateurMeta } from '@/utils/statuts';

const pwdSchema = z.object({
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Les mots de passe ne correspondent pas.' });
type PwdValues = z.infer<typeof pwdSchema>;

const btn = 'flex items-center gap-2 rounded-lg bg-omda-green px-4 py-2 text-sm font-medium text-white hover:bg-omda-greenDark disabled:opacity-60';

export default function ProfilPage() {
  const { profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(profile?.telephone ?? '');
  const [savingPhone, setSavingPhone] = useState(false);
  const pwd = useForm<PwdValues>({ resolver: zodResolver(pwdSchema) });
  const [showPwd, setShowPwd] = useState(false);
  const strength = passwordStrength(pwd.watch('password') ?? '');

  if (!profile) return null;
  const forced = profile.statut === 'EN_ATTENTE_CHANGEMENT_MDP';

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      await updateOwnPhone(profile.id, phone.trim() || null);
      await refreshProfile();
      toast.success('Téléphone mis à jour.');
    } catch (e) { toast.error(toFrenchMessage(e, 'La mise à jour du téléphone a échoué.')); }
    finally { setSavingPhone(false); }
  };

  const savePassword = pwd.handleSubmit(async (v) => {
    try {
      await changePassword(profile.id, v.password);
      await refreshProfile();
      pwd.reset();
      toast.success('Mot de passe modifié.');
    } catch (e) { toast.error(toFrenchMessage(e, 'Le changement de mot de passe a échoué.')); }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-omda-green text-2xl font-bold text-white">{profile.email.charAt(0).toUpperCase()}</span>
          <div>
            <h1 className="text-2xl font-bold">Mon profil</h1>
            <p className="text-sm text-omda-textGray">{profile.email} – {roleLabels[profile.role]}</p>
          </div>
        </div>
        {profile.role === 'ADMINISTRATEUR' && (
          <Link to="/utilisateurs" className="inline-flex items-center gap-2 rounded-lg border border-omda-borderGray bg-white px-3 py-2 text-sm font-medium hover:bg-omda-warmGray">
            <Users className="h-4 w-4 text-omda-green" /> Gérer les comptes du personnel
          </Link>
        )}
      </div>
      {forced && <p className="rounded-lg bg-omda-ochre/15 px-4 py-3 text-sm text-omda-ochreDark">Pour des raisons de sécurité, vous devez changer votre mot de passe avant de continuer.</p>}

      <Card title="Informations">
        <InfoGrid items={[
          ['Email', profile.email], ['Rôle', roleLabels[profile.role]],
          ['Statut', <StatusBadge {...utilisateurMeta[profile.statut]} />],
          ['Dernière connexion', formatDateTime(profile.derniere_connexion_at)],
        ]} />
        <div className="flex items-end gap-2 border-t border-omda-warmGray p-5">
          <div className="flex-1"><Field label="Téléphone"><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field></div>
          <button onClick={savePhone} disabled={savingPhone} className={btn}>{savingPhone && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer</button>
        </div>
      </Card>

      <Card title="Changer le mot de passe">
        <form onSubmit={savePassword} className="space-y-4 p-5" noValidate>
          <Field label="Nouveau mot de passe" error={pwd.formState.errors.password?.message}>
            <span className="relative block">
              <input type={showPwd ? 'text' : 'password'} autoComplete="new-password" className={`${inputClass} pr-11`} {...pwd.register('password')} />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-omda-textGray hover:text-omda-black"
                aria-label={showPwd ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}>
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
            {strength.score > 0 && (
              <span className="mt-2 flex items-center gap-2" aria-live="polite">
                <span className="flex flex-1 gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? ['', 'bg-omda-errorRed', 'bg-omda-ochre', 'bg-omda-green', 'bg-omda-greenDark'][strength.score] : 'bg-omda-borderGray'}`} />
                  ))}
                </span>
                <span className="text-xs text-omda-textGray">{strength.label}</span>
              </span>
            )}
          </Field>
          <Field label="Confirmation" error={pwd.formState.errors.confirm?.message}>
            <input type={showPwd ? 'text' : 'password'} autoComplete="new-password" className={inputClass} {...pwd.register('confirm')} />
          </Field>
          <button type="submit" disabled={pwd.formState.isSubmitting} className={btn}>
            {pwd.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Modifier le mot de passe
          </button>
        </form>
      </Card>
    </div>
  );
}
