import { describe, it, expect } from 'vitest';

// Templates will be created by the notification agent — test the contract
// We import dynamically to handle the case where files don't exist yet during initial test writing
describe('bookingConfirmedHtml', () => {
  it('contains athlete name and coach name', async () => {
    const { bookingConfirmedHtml } = await import('@/lib/notifications/templates');
    const html = bookingConfirmedHtml({
      athleteName: 'Jean Dupont',
      coachName: 'Marie Martin',
      sessionTitle: 'CrossFit Debutant',
      date: '15/04/2026',
      time: '10:00',
      price: '45,00 EUR',
    });
    expect(html).toContain('Jean Dupont');
    expect(html).toContain('Marie Martin');
    expect(html).toContain('CrossFit Debutant');
    expect(html).toContain('15/04/2026');
    expect(html).toContain('10:00');
    expect(html).toContain('45,00 EUR');
  });

  it('returns valid HTML with confirmation title', async () => {
    const { bookingConfirmedHtml } = await import('@/lib/notifications/templates');
    const html = bookingConfirmedHtml({
      athleteName: 'Test',
      coachName: 'Coach',
      sessionTitle: 'Session',
      date: '01/01/2026',
      time: '09:00',
      price: '30 EUR',
    });
    expect(html).toContain('confirmée');
    expect(html).toContain('<table');
  });
});

describe('bookingCancelledHtml', () => {
  it('shows full refund message when refund is full', async () => {
    const { bookingCancelledHtml } = await import('@/lib/notifications/templates');
    const html = bookingCancelledHtml({
      recipientName: 'Jean',
      sessionTitle: 'Yoga',
      date: '20/04/2026',
      cancelledBy: 'coach',
      refundType: 'full',
    });
    expect(html).toContain('Jean');
    expect(html).toContain('Yoga');
    expect(html).toContain('remboursement');
  });

  it('shows no refund message when refund is none', async () => {
    const { bookingCancelledHtml } = await import('@/lib/notifications/templates');
    const html = bookingCancelledHtml({
      recipientName: 'Marie',
      sessionTitle: 'Boxing',
      date: '20/04/2026',
      cancelledBy: 'athlete',
      refundType: 'none',
    });
    expect(html).toContain('Marie');
    expect(html).toContain('Aucun remboursement');
  });

  it('indicates coach cancelled when cancelledBy is coach', async () => {
    const { bookingCancelledHtml } = await import('@/lib/notifications/templates');
    const html = bookingCancelledHtml({
      recipientName: 'Test',
      sessionTitle: 'Test',
      date: '01/01/2026',
      cancelledBy: 'coach',
      refundType: 'full',
    });
    expect(html).toContain('coach');
  });
});

describe('paymentConfirmedHtml', () => {
  it('contains amount and session title', async () => {
    const { paymentConfirmedHtml } = await import('@/lib/notifications/templates');
    const html = paymentConfirmedHtml({
      athleteName: 'Pierre',
      amount: '60,00 EUR',
      sessionTitle: 'Personal Training',
    });
    expect(html).toContain('Pierre');
    expect(html).toContain('60,00 EUR');
    expect(html).toContain('Personal Training');
    expect(html).toContain('confirmé');
  });
});
