import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
} from '../constants/enums.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (config.email.provider === 'console' || !config.email.smtp.host) {
      return nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }
    return nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.port === 465,
      auth: config.email.smtp.user
        ? { user: config.email.smtp.user, pass: config.email.smtp.pass }
        : undefined,
    });
  })();

  return transporterPromise;
}

function buildWhatsAppLink(text) {
  const number = config.whatsappNumber.replace(/\D/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

async function persistAndSend({
  userId,
  bookingId,
  channel,
  type,
  recipient,
  message,
}) {
  const notification = await Notification.create({
    userId,
    bookingId: bookingId || null,
    channel,
    type,
    status: NOTIFICATION_STATUS.PENDING,
    recipient,
    message,
  });

  try {
    if (channel === NOTIFICATION_CHANNEL.EMAIL) {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: config.email.from,
        to: recipient,
        subject: `Local Cab — ${type.replace(/_/g, ' ')}`,
        text: message,
      });

      if (config.email.provider === 'console' || !config.email.smtp.host) {
        const preview = info.message?.toString?.() || message;
        logger.info('notification.email_console', { to: recipient, type, preview: preview.slice(0, 500) });
      }

      notification.status = NOTIFICATION_STATUS.SENT;
      notification.sentAt = new Date();
      await notification.save();
      logger.info('notification.sent', { id: notification._id.toString(), type, channel });
    } else {
      // WhatsApp / SMS: deep-link only — mark SENT as payload prepared
      notification.status = NOTIFICATION_STATUS.SENT;
      notification.sentAt = new Date();
      await notification.save();
      logger.info('notification.sent', { id: notification._id.toString(), type, channel });
    }
  } catch (err) {
    notification.status = NOTIFICATION_STATUS.FAILED;
    notification.error = err.message;
    await notification.save();
    logger.warn('notification.failed', {
      id: notification._id.toString(),
      type,
      message: err.message,
    });
  }

  return notification;
}

async function buildBookingSummary(booking) {
  const user = await User.findById(booking.userId);
  const ride = await Ride.findById(booking.rideId).populate('routeId');
  const route = ride?.routeId;
  const origin = route?.origin?.city || 'Origin';
  const destination = route?.destination?.city || 'Destination';
  const when = ride?.departureTime ? new Date(ride.departureTime).toISOString() : '';
  const seats = (booking.selectedSeats || []).join(', ');

  return {
    user,
    ride,
    text: [
      `Booking ${booking.bookingNumber}`,
      `Route: ${origin} → ${destination}`,
      `Departure: ${when}`,
      `Seats: ${seats}`,
      `Amount: ₹${booking.totalAmount}`,
      `Status: ${booking.bookingStatus}`,
    ].join('\n'),
  };
}

/**
 * Send booking confirmation. Never throws to caller of payment flow —
 * errors are caught and persisted.
 */
export async function sendBookingConfirmation(booking) {
  try {
    const { user, text } = await buildBookingSummary(booking);
    if (!user?.email) return null;

    const emailMsg = `Your booking is confirmed.\n\n${text}\n\nThank you for riding with Local Cab.`;
    await persistAndSend({
      userId: user._id,
      bookingId: booking._id,
      channel: NOTIFICATION_CHANNEL.EMAIL,
      type: 'BOOKING_CONFIRMATION',
      recipient: user.email,
      message: emailMsg,
    });

    const wa = buildWhatsAppLink(`Hi, my booking ${booking.bookingNumber} is confirmed.\n${text}`);
    await persistAndSend({
      userId: user._id,
      bookingId: booking._id,
      channel: NOTIFICATION_CHANNEL.WHATSAPP,
      type: 'BOOKING_CONFIRMATION',
      recipient: user.phone || config.whatsappNumber,
      message: wa,
    });

    return { whatsappLink: wa };
  } catch (err) {
    logger.warn('notification.failed', { type: 'BOOKING_CONFIRMATION', message: err.message });
    return null;
  }
}

export async function sendBookingCancellation(booking) {
  try {
    const { user, text } = await buildBookingSummary(booking);
    if (!user?.email) return null;

    await persistAndSend({
      userId: user._id,
      bookingId: booking._id,
      channel: NOTIFICATION_CHANNEL.EMAIL,
      type: 'BOOKING_CANCELLATION',
      recipient: user.email,
      message: `Your booking has been cancelled.\n\n${text}`,
    });
  } catch (err) {
    logger.warn('notification.failed', { type: 'BOOKING_CANCELLATION', message: err.message });
  }
}

export async function sendPaymentFailure(booking) {
  try {
    const { user, text } = await buildBookingSummary(booking);
    if (!user?.email) return null;

    await persistAndSend({
      userId: user._id,
      bookingId: booking._id,
      channel: NOTIFICATION_CHANNEL.EMAIL,
      type: 'PAYMENT_FAILURE',
      recipient: user.email,
      message: `Payment failed for your booking.\n\n${text}\n\nPlease try again before the hold expires.`,
    });
  } catch (err) {
    logger.warn('notification.failed', { type: 'PAYMENT_FAILURE', message: err.message });
  }
}

export async function sendTripReminder(booking) {
  try {
    const { user, text } = await buildBookingSummary(booking);
    if (!user?.email) return null;
    await persistAndSend({
      userId: user._id,
      bookingId: booking._id,
      channel: NOTIFICATION_CHANNEL.EMAIL,
      type: 'TRIP_REMINDER',
      recipient: user.email,
      message: `Reminder: your trip is coming up.\n\n${text}`,
    });
  } catch (err) {
    logger.warn('notification.failed', { type: 'TRIP_REMINDER', message: err.message });
  }
}

export { buildWhatsAppLink };
