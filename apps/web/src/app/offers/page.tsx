import { fetchCandidatesOverview } from '@/lib/api/endpoints';
import { PageHeader } from '@/components/page-header';
import { OfferList } from '@/components/offers/offer-list';

export default async function OffersPage() {
  const rows = await fetchCandidatesOverview();
  const offers = rows.filter((row) => row.stage === 'OFFER');

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Candidatos con oferta"
          subtitle="Revisa los detalles clave antes del cierre."
          backLink={{ href: '/pipeline', label: '← Volver al resumen general' }}
        />
        <OfferList offers={offers} />
      </div>
    </main>
  );
}
