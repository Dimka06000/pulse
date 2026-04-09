import { getResendClient } from './resend';
import {
  bookingConfirmedHtml,
  bookingCancelledHtml,
  paymentConfirmedHtml,
  type BookingConfirmedData,
  type BookingCancelledData,
  type PaymentConfirmedData,
} from './templates';

const FROM = 'Coaching <noreply@coaching-app.fr>';

export async function sendBookingConfirmation(
  to: string,
  data: BookingConfirmedData,
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Réservation confirmée — ${data.sessionTitle}`,
    html: bookingConfirmedHtml(data),
  });
}

export async function sendBookingCancellation(
  to: string,
  data: BookingCancelledData,
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Séance annulée — ${data.sessionTitle}`,
    html: bookingCancelledHtml(data),
  });
}

export async function sendPaymentConfirmation(
  to: string,
  data: PaymentConfirmedData,
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Paiement confirmé — ${data.amount}`,
    html: paymentConfirmedHtml(data),
  });
}
