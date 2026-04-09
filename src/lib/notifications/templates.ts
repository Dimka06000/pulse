// Email templates — French text, inline CSS, Montserrat font.

export interface BookingConfirmedData {
  athleteName: string;
  coachName: string;
  sessionTitle: string;
  date: string;
  time: string;
  price: string;
}

export interface BookingCancelledData {
  recipientName: string;
  sessionTitle: string;
  date: string;
  cancelledBy: 'coach' | 'athlete';
  refundType: 'full' | 'partial' | 'none';
}

export interface PaymentConfirmedData {
  athleteName: string;
  amount: string;
  sessionTitle: string;
}

// ---- Shared layout ----

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Montserrat',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:24px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Coaching</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center;">
              Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- Templates ----

export function bookingConfirmedHtml(data: BookingConfirmedData): string {
  return layout('Réservation confirmée', `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Réservation confirmée</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Bonjour ${data.athleteName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">Votre séance a bien été réservée. Voici les détails :</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Coach</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.coachName}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Séance</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.sessionTitle}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Date</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.date}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Heure</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.time}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Tarif</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.price}</td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#52525b;">À bientôt !</p>
  `);
}

export function bookingCancelledHtml(data: BookingCancelledData): string {
  const cancellerLabel = data.cancelledBy === 'coach' ? 'le coach' : "l'athlète";
  const refundLabel =
    data.refundType === 'full'
      ? 'Un remboursement intégral sera effectué.'
      : data.refundType === 'partial'
        ? 'Un remboursement partiel sera effectué.'
        : 'Aucun remboursement applicable.';

  return layout('Séance annulée', `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Séance annulée</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Bonjour ${data.recipientName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">La séance suivante a été annulée par ${cancellerLabel} :</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Séance</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.sessionTitle}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Date</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.date}</td></tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#18181b;">Remboursement</p>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;">${refundLabel}</p>
    <p style="margin:0;font-size:14px;color:#52525b;">N'hésitez pas à réserver une nouvelle séance.</p>
  `);
}

export function paymentConfirmedHtml(data: PaymentConfirmedData): string {
  return layout('Paiement confirmé', `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Paiement confirmé</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Bonjour ${data.athleteName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">Votre paiement a bien été reçu. Voici votre reçu :</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Séance</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.sessionTitle}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Montant</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${data.amount}</td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#52525b;">Merci pour votre confiance !</p>
  `);
}
