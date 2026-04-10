export {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendPaymentConfirmation,
  sendSessionReminder,
  sendNewBookingCoach,
  sendWeeklyDigest,
  sendNewMessage,
} from './send';

export type {
  BookingConfirmedData,
  BookingCancelledData,
  PaymentConfirmedData,
  SessionReminderData,
  NewBookingCoachData,
  WeeklyDigestData,
  NewMessageData,
} from './templates';
