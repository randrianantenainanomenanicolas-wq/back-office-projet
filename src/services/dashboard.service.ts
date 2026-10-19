import { supabase } from '@/lib/supabase';
import { STATUTS_DEMANDE, type StatutDemande } from '@/types/enums';
import { DELAI_INDICATIF_HEURES } from '@/utils/dossier';

async function countRows(table: string, column?: string, values?: readonly string[]): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (column && values) query = query.in(column, [...values]);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function countHorsDelai(): Promise<number> {
  const limite = new Date(Date.now() - DELAI_INDICATIF_HEURES * 3_600_000).toISOString();
  const { count, error } = await supabase.from('demande_adhesion').select('*', { count: 'exact', head: true })
    .in('statut', ['ENVOYEE', 'EN_COURS_DE_VERIFICATION']).lt('date_soumission', limite);
  if (error) throw error;
  return count ?? 0;
}

export interface DashboardStats {
  membres: number;
  candidats: number;
  demandes: Record<StatutDemande, number>;
  oeuvres: { total: number; enAttente: number };
  paiements: { reussis: number; enAttente: number };
  horsDelai: number;
  categoriesEnAttente: number;
}

// Interprétation de « en attente » (le schéma ne la définit pas, à valider) :
//  - œuvres : ENVOYEE + EN_COURS_DE_VALIDATION
//  - paiements : INITIE + EN_ATTENTE_CONFIRMATION (confirmation MVola côté serveur)
//  - hors délai : demande ENVOYEE / EN_COURS_DE_VERIFICATION soumise depuis plus de 72 h
export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    membres, candidats, oeuvresTotal, oeuvresAttente, paiementsReussis, paiementsAttente, horsDelai, categoriesEnAttente,
    ...parStatut
  ] = await Promise.all([
    countRows('membre'),
    countRows('candidat'),
    countRows('oeuvre'),
    countRows('oeuvre', 'statut', ['ENVOYEE', 'EN_COURS_DE_VALIDATION']),
    countRows('paiement', 'statut', ['REUSSI']),
    countRows('paiement', 'statut', ['INITIE', 'EN_ATTENTE_CONFIRMATION']),
    countHorsDelai(),
    countRows('membre_categorie', 'statut', ['EN_ATTENTE']),
    ...STATUTS_DEMANDE.map((s) => countRows('demande_adhesion', 'statut', [s])),
  ]);

  const demandes = Object.fromEntries(
    STATUTS_DEMANDE.map((s, i) => [s, parStatut[i]]),
  ) as Record<StatutDemande, number>;

  return {
    membres,
    candidats,
    demandes,
    oeuvres: { total: oeuvresTotal, enAttente: oeuvresAttente },
    paiements: { reussis: paiementsReussis, enAttente: paiementsAttente },
    horsDelai,
    categoriesEnAttente,
  };
}
