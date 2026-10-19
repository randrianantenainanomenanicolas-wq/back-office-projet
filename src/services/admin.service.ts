import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { RoleUtilisateur } from '@/types/enums';
import { UserFacingError } from '@/utils/errors';

/**
 * Création, réinitialisation de mot de passe et suppression de comptes : ces opérations exigent la clé
 * `service_role`, qui ne doit JAMAIS être dans le navigateur. Elles passent par l'Edge Function `admin-users`
 * (voir supabase/functions/admin-users), qui revérifie que l'appelant est administrateur.
 */
async function call<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as { error?: string };
        if (body?.error) throw new UserFacingError(body.error);
      } catch (e) { if (e instanceof UserFacingError) throw e; }
    }
    throw new UserFacingError("Le service d'administration des comptes est indisponible. Vérifiez qu'il est déployé (voir le README).");
  }
  if (data && typeof data === 'object' && 'error' in data) throw new UserFacingError(String((data as { error: unknown }).error));
  return data as T;
}

export type StaffRole = Exclude<RoleUtilisateur, 'MEMBRE'>;
export interface CreatedUser { id: string; email: string; temporaryPassword: string }

export const createStaffUser = (v: { email: string; role: StaffRole; telephone: string | null }) => call<CreatedUser>('create', v);
export const resetUserPassword = (userId: string) => call<{ temporaryPassword: string }>('reset_password', { userId });
export const deleteStaffUser = (userId: string) => call<{ ok: true }>('delete', { userId });
