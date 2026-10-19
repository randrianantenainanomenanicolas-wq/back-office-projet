# OMDA — Back Office (React + TypeScript + Vite + Supabase)

Interface des **agents et administrateurs** de l'OMDA. Elle partage le **même projet Supabase** que l'application mobile
(`omda-mobile`) et reprend sa charte (palette `omda-*`, logo, vocabulaire, statuts, règles métier).

## Démarrage
1. `npm install`
2. `.env` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — **mêmes valeurs** que `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` du mobile (clé publique uniquement, jamais la service_role)
3. `npm run dev` · `npm run build` (typage + build) · `npm test`

Prérequis base : script `docs/SCHEMA_DB.md` du mobile (MVola uniquement), puis migrations mobile `0001` → `0003`,
puis les correctifs de sécurité `docs/sql/01_patch_securite.sql` (à appliquer) et `docs/sql/02_patch_stockage.sql` (à tester avec le mobile avant). Le compte de connexion doit avoir une ligne `utilisateur` de rôle AGENT ou ADMINISTRATEUR.

## Qui fait quoi : mobile ⇄ Back Office

| Action côté mobile / serveur | Données | Écran Back Office |
|---|---|---|
| Le candidat envoie son dossier (API Express, sans compte) | `candidat`, `demande_adhesion` (ENVOYEE), `piece`, `oeuvre` + `attestation_diffusion` | **Demandes d'adhésion** : contrôle du dossier (pièces, ≥ 2 œuvres, attestations, autorisation parentale 15–17 ans), indicateur « hors délai 72 h » |
| L'agent valide ou rejette (motif obligatoire) | `demande_adhesion` → VALIDEE / REJETEE + notification | idem — **valider ne crée pas le membre** |
| Le candidat paie les frais d'adhésion par MVola | `paiement` (INITIE → EN_ATTENTE_CONFIRMATION → REUSSI par le serveur) | **Paiements** (lecture seule, journal) |
| Le serveur finalise l'adhésion | `membre`, numéro d'adhérent, identifiants, `demande_adhesion` → ADHESION_TERMINEE | **Membres** |
| Le membre dépose une œuvre | `oeuvre` (ENVOYEE) + attestation | **Œuvres** : valider / rejeter (motif obligatoire) ; paiement du dépôt puis DEPOT_FINALISE par le serveur |
| Le membre demande une catégorie supplémentaire | `membre_categorie` (EN_ATTENTE) | **Catégories demandées** : activer / refuser |
| Le BO publie catégories, tarifs, documentation | `categorie`, `tarif`, `documentation` (`actif` / `publie`) | **Paramètres** → visibles dans le mobile (accueil, tarifs, documentation) |
| Le BO envoie une notification globale | `notification` (globale) | **Notifications** → onglet Notifications du mobile |

Retirés car absents du schéma du mobile (paiement MVola uniquement, plus de virement) : coordonnées bancaires, preuves de virement,
validation manuelle de paiement, opérateurs Mobile Money, cotisations (écran supprimé).

## Architecture
`src/services` (accès Supabase) → `src/features/*/hooks.ts` (TanStack Query) → pages. `src/types/enums.ts` = ENUM du schéma mobile.
`src/utils/dossier.ts` = règles métier partagées avec le mobile (72 h, 2 œuvres, pièces, âge).

## Points ouverts
- Correctifs de sécurité (`docs/sql/`) : auto-promotion de rôle, rôle lu dans la table, paiement forgé, journal en lecture seule, INSERT notification pour le staff (n°1) ; stockage public (n°2, à tester avec le mobile).
- Création d'agents / administrateurs : Edge Function ou API Express avec service_role (jamais depuis le navigateur).
- Aucun trigger `updated_at` dans le schéma : renseigné côté client.
- Pas de colonne « motif » sur `membre_categorie` : un refus de catégorie ne peut pas être motivé.

## Qualité et livraison
- **Intégration continue** : `.github/workflows/ci.yml` lance typage, tests et build à chaque envoi sur GitHub.
- **Chargement par page** : chaque écran est un morceau de code téléchargé à la demande (`src/app/router.tsx`).
- **Erreurs** : une erreur dans une page s'affiche dans le contenu, menu conservé (`RouteError`) ; une page inconnue affiche « Page introuvable ».
- **Export CSV** (membres, demandes, paiements) : toutes les lignes correspondant aux filtres, séparateur `;`, accents compatibles Excel, cellules protégées contre l'injection de formules (`src/utils/csv.ts`).
- **Déploiement** : `npm run build` produit `dist/`. Hébergeur statique avec redirection de toutes les routes vers `index.html` (application monopage), variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` définies chez l'hébergeur.

## Administration (réservée aux administrateurs)
- **Comptes du personnel** (page Utilisateurs) : ajouter un utilisateur, réinitialiser son mot de passe, le supprimer. Ces opérations passent par l'Edge Function `supabase/functions/admin-users`, car elles exigent la clé `service_role`, qui ne doit jamais être dans le navigateur. La fonction revérifie que l'appelant est administrateur actif.
  - Déploiement (une fois, et après chaque modification de la fonction) :
    `npx supabase login`, puis `npx supabase link --project-ref <identifiant>`, puis `npx supabase functions deploy admin-users`.
  - Aucun secret à configurer : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement aux fonctions.
  - Le mot de passe temporaire est affiché une seule fois ; l'utilisateur doit le changer à sa première connexion.
- **Suppressions** : bouton « Zone de danger » sur les fiches (candidat, demande, œuvre, membre, paiement) et icône corbeille sur les lignes (catégories, tarifs, documentation, notifications, catégories demandées, comptes). Invisibles pour les agents.
  - Garde-fous : un paiement réussi, une demande validée et un dépôt d'œuvre finalisé ne se suppriment jamais ; un parent ayant des enfants (ex. membre avec œuvres) est refusé avec une explication.
  - Il faut appliquer `docs/sql/03_patch_suppressions.sql` (après le n°1) : sans lui, la base refuse les suppressions.
- **Exports** : menu « Exporter » sur les listes (membres, candidats, demandes, œuvres, paiements, utilisateurs). CSV pour Excel, ou PDF via la fenêtre d'impression du navigateur (choisir « Enregistrer au format PDF »).
"# back-office-projet" 
