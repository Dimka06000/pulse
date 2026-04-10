export {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendPaymentConfirmation,
  sendSessionReminder,
  sendNewBookingCoach,
  sendWeeklyDigest,
} from './send';

export type {
  BookingConfirmedData,
  BookingCancelledData,
  PaymentConfirmedData,
  SessionReminderData,
  NewBookingCoachData,
  WeeklyDigestData,
} from './templates';
