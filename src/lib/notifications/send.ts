import { getResendClient } from './resend';
import {
  bookingConfirmedHtml,
  bookingCancelledHtml,
  paymentConfirmedHtml,
  sessionReminderHtml,
  newBookingCoachHtml,
  weeklyDigestHtml,
  type BookingConfirmedData,
  type BookingCancelledData,
  type PaymentConfirmedData,
  type SessionReminderData,
  type NewBookingCoachData,
  type WeeklyDigestData,
} from './templates';

const FROM = 'Pulse <noreply@pulse-app.fr>';

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

export async function sendSessionReminder(
  to: string,
  data: SessionReminderData,
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Rappel — ${data.sessionTitle} demain à ${data.time}`,
    html: sessionReminderHtml(data),
  });
}

export async function sendNewBookingCoach(
  to: string,
  data: NewBookingCoachData,
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Nouvelle réservation — ${data.athleteName}`,
    html: newBookingCoachHtml(data),
  });
}

export async function sendWeeklyDigest(
  to: string,
  data: WeeklyDigestData,
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Votre semaine Pulse — ${data.sessionsCount} séance${data.sessionsCount > 1 ? 's' : ''}`,
    html: weeklyDigestHtml(data),
  });
}
