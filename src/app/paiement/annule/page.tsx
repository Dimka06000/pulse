import Link from 'next/link';

export const metadata = { title: 'Paiement annulé' };

export default function PaymentCancelledPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
        Paiement annulé
      </h1>
      <p className="text-gray-500 mb-8">
        Le paiement a été annulé. Votre créneau n&apos;a pas été réservé.
      </p>
      <Link
        href="/"
        className="inline-block bg-brand-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
