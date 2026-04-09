import type { ModuleManifest } from '@oikos/core';

export const COACHING_MANIFEST: ModuleManifest = {
  id: 'coaching',
  name: 'Coaching',
  version: '0.1.0',
  description: 'Coaching platform — connect coaches and clients with sessions, events, and collaborations',
  personas: {
    a: { id: 'client', label: 'Client' },
    b: { id: 'coach', label: 'Coach' },
  },
  permissions: {
    events: {
      publish: [
        'coaching.session.booked',
        'coaching.session.completed',
        'coaching.session.cancelled',
        'coaching.collaboration.created',
        'coaching.collaboration.completed',
        'coaching.event.created',
        'coaching.event.cancelled',
        'coaching.rating.submitted',
        'coaching.payment.completed',
      ],
      subscribe: [
        'calendar.event.created',
        'calendar.booking.confirmed',
        'payments.transaction.completed',
        'payments.transaction.refunded',
      ],
    },
  },
};
