import Link from 'next/link';

export const metadata = { title: 'Paiement réussi' };

export default function PaymentSuccessPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
        Paiement confirmé
      </h1>
      <p className="text-gray-500 mb-8">
        Votre réservation est confirmée. Vous recevrez un email de confirmation.
      </p>
      <Link
        href="/bookings"
        className="inline-block bg-brand-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors"
      >
        Voir mes réservations
      </Link>
    </div>
  );
}
