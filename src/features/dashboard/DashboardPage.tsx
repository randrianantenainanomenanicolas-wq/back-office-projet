import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlarmClock, ArrowRight, Bell, CalendarDays, CheckCircle2, Clock, CreditCard, FileCheck2, Layers, Music2,
  UserSearch, Users, XCircle, type LucideIcon,
} from 'lucide-react';
import Card from '@/components/common/Card';
import { ListSkeleton, Skeleton, StatCardSkeleton } from '@/components/common/Skeleton';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { useDemandes } from '@/features/demandes/hooks';
import { getDashboardStats } from '@/services/dashboard.service';
import { STATUTS_DEMANDE } from '@/types/enums';
import { formatDate } from '@/utils/format';
import { demandeMeta, roleLabels } from '@/utils/statuts';

// Couleur des barres selon le sens du statut (même logique que les badges).
const BAR_COLORS: Record<string, string> = {
  BROUILLON: '#B9B5A9', ENVOYEE: '#2E4A66', EN_COURS_DE_VERIFICATION: '#C79A3B',
  VALIDEE: '#2E7A46', REJETEE: '#B3261E', ADHESION_TERMINEE: '#205C35',
};

// Icônes d'application : toutes les teintes viennent de la palette OMDA.
const TILE_COLORS = { green: 'bg-omda-green', forest: 'bg-omda-forest', ochre: 'bg-omda-ochreDark', blue: 'bg-omda-infoBlueGray' } as const;
interface Tile { to: string; label: string; icon: LucideIcon; color: keyof typeof TILE_COLORS; badge?: number }

function AppTile({ to, label, icon: Icon, color, badge = 0 }: Tile) {
  return (
    <Link to={to} className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition-colors hover:bg-omda-warmGray/70">
      <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm transition-transform group-hover:-translate-y-0.5 group-active:scale-95 ${TILE_COLORS[color]}`}>
        <Icon className="h-6 w-6" />
        {badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-omda-ochre px-1 text-[11px] font-bold text-omda-black ring-2 ring-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="text-xs font-medium leading-tight sm:text-sm">{label}</span>
    </Link>
  );
}

function RecentDemandes() {
  const { data, isLoading, isError } = useDemandes({ page: 1, pageSize: 5 });
  return (
    <Card title="Dernières demandes" action={<Link to="/demandes" className="inline-flex items-center gap-1 text-sm font-medium text-omda-green hover:underline">Tout voir <ArrowRight className="h-4 w-4" /></Link>}>
      {isLoading ? <ListSkeleton rows={5} /> : isError ? (
        <p className="p-6 text-center text-sm text-omda-errorRed">Une erreur est survenue lors du chargement des demandes.</p>
      ) : !data || data.rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-omda-textGray">Aucune demande d'adhésion pour le moment.</p>
      ) : (
        <ul className="divide-y divide-omda-warmGray/80">
          {data.rows.map((d) => {
            const nom = d.candidat ? `${d.candidat.prenom} ${d.candidat.nom}` : d.numero_dossier;
            const initiales = d.candidat ? `${d.candidat.prenom.charAt(0)}${d.candidat.nom.charAt(0)}`.toUpperCase() : '#';
            return (
              <li key={d.id}>
                <Link to={`/demandes/${d.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-omda-green/5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-omda-green/10 text-sm font-semibold text-omda-green">{initiales}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{nom}</span>
                    <span className="block truncate text-xs text-omda-textGray">{d.numero_dossier} – {formatDate(d.date_soumission)}</span>
                  </span>
                  <span className="shrink-0"><StatusBadge {...demandeMeta[d.statut]} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Chargement du tableau de bord">
      <div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72 max-w-full" /></div>
      <div className="rounded-2xl border border-omda-borderGray/80 bg-white p-4 shadow-card">
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="flex flex-col items-center gap-2 p-2"><Skeleton className="h-14 w-14 rounded-2xl" /><Skeleton className="h-3 w-12" /></div>)}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: getDashboardStats });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="rounded-xl border border-omda-errorRed/30 bg-omda-errorRed/10 p-6 text-sm text-omda-errorRed">
        Une erreur est survenue lors du chargement du tableau de bord.{' '}
        <button onClick={() => refetch()} className="font-medium underline">Réessayer</button>
      </div>
    );
  }

  const enAttente = data.demandes.ENVOYEE + data.demandes.EN_COURS_DE_VERIFICATION;
  const chart = STATUTS_DEMANDE.map((s) => ({ code: s, statut: demandeMeta[s].label, total: data.demandes[s] }));
  const totalDemandes = chart.reduce((sum, c) => sum + c.total, 0);
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const tiles: Tile[] = [
    { to: '/demandes', label: 'Demandes', icon: FileCheck2, color: 'forest', badge: enAttente },
    { to: '/oeuvres', label: 'Œuvres', icon: Music2, color: 'ochre', badge: data.oeuvres.enAttente },
    { to: '/paiements', label: 'Paiements', icon: CreditCard, color: 'green', badge: data.paiements.enAttente },
    { to: '/demandes-categorie', label: 'Catégories demandées', icon: Layers, color: 'forest', badge: data.categoriesEnAttente },
    { to: '/membres', label: 'Membres', icon: Users, color: 'green' },
    { to: '/candidats', label: 'Candidats', icon: UserSearch, color: 'blue' },
    { to: '/notifications', label: 'Notifications', icon: Bell, color: 'blue' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="mt-1 text-sm text-omda-textGray">Bonjour{profile ? `, ${roleLabels[profile.role].toLowerCase()}` : ''}. Voici ce qui attend un traitement aujourd'hui.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium capitalize text-omda-textGray shadow-card ring-1 ring-omda-borderGray/70">
          <CalendarDays className="h-4 w-4 text-omda-green" /> {today}
        </span>
      </div>

      <nav aria-label="Accès rapide" className="rounded-2xl border border-omda-borderGray/80 bg-white p-3 shadow-card sm:p-4">
        <div className="grid grid-cols-4 gap-1 sm:gap-2 lg:grid-cols-7">
          {tiles.map((t) => <AppTile key={t.to} {...t} />)}
        </div>
      </nav>

      <section aria-labelledby="a-traiter" className="space-y-3">
        <h2 id="a-traiter" className="font-semibold">À traiter</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard tone="alert" label="Dossiers hors délai (72 h)" value={data.horsDelai} icon={AlarmClock} hint="À traiter en priorité" />
          <StatCard tone="alert" label="Demandes en attente" value={enAttente} icon={Clock} hint="Envoyées + en cours de vérification" />
          <StatCard tone="alert" label="Œuvres en attente" value={data.oeuvres.enAttente} icon={FileCheck2} hint="Envoyées + en cours de validation" />
          <StatCard tone="alert" label="Catégories demandées" value={data.categoriesEnAttente} icon={Layers} hint="Demandes des membres en attente" />
          <StatCard tone="alert" label="Paiements en attente" value={data.paiements.enAttente} icon={CreditCard} hint="Initiés ou en attente de confirmation MVola" />
        </div>
      </section>

      <section aria-labelledby="vue-ensemble" className="space-y-3">
        <h2 id="vue-ensemble" className="font-semibold">Vue d'ensemble</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Membres" value={data.membres} icon={Users} />
          <StatCard label="Candidats" value={data.candidats} icon={UserSearch} />
          <StatCard label="Œuvres" value={data.oeuvres.total} icon={Music2} />
          <StatCard label="Demandes validées" value={data.demandes.VALIDEE} icon={CheckCircle2} />
          <StatCard label="Demandes rejetées" value={data.demandes.REJETEE} icon={XCircle} />
          <StatCard label="Paiements réussis" value={data.paiements.reussis} icon={CreditCard} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-omda-borderGray/80 bg-white p-5 shadow-card xl:col-span-2">
          <h2 className="mb-4 font-semibold">Demandes d'adhésion par statut</h2>
          {totalDemandes === 0 ? (
            <p className="py-10 text-center text-sm text-omda-textGray">Aucune demande d'adhésion pour le moment.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E5DB" />
                  <XAxis dataKey="statut" tick={{ fontSize: 11, fill: '#6B675E' }} interval={0} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B675E' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(46,122,70,0.06)' }} contentStyle={{ borderRadius: 8, border: '1px solid #DDD9CE', fontSize: 12 }} />
                  <Bar dataKey="total" name="Demandes" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {chart.map((c) => <Cell key={c.code} fill={BAR_COLORS[c.code] ?? '#2E7A46'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <RecentDemandes />
      </div>
    </div>
  );
}
