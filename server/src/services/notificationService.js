import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { Driver } from '../models/Driver.js';
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
    if (process.env.EMAIL_FORCE_FAIL === '1' && channel === NOTIFICATION_CHANNEL.EMAIL) {
      throw new Error('forced email failure');
    }
    if (channel === NOTIFICATION_CHANNEL.EMAIL) {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: config.email.from,
        to: recipient,
        subject: `RaahiX — ${type.replace(/_/g, ' ')}`,
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

    const emailMsg = `Your booking is confirmed.\n\n${text}\n\nThank you for riding with RaahiX.`;
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

export async function notifyUser({ userId, bookingId, type, message, email, phone }) {
  try {
    await persistAndSend({
      userId,
      bookingId,
      channel: NOTIFICATION_CHANNEL.IN_APP,
      type,
      recipient: 'in-app',
      message,
    });
    if (email) {
      await persistAndSend({
        userId,
        bookingId,
        channel: NOTIFICATION_CHANNEL.EMAIL,
        type,
        recipient: email,
        message,
      });
    }
    if (phone) {
      await persistAndSend({
        userId,
        bookingId,
        channel: NOTIFICATION_CHANNEL.WHATSAPP,
        type,
        recipient: phone,
        message: buildWhatsAppLink(message),
      });
    }
  } catch (err) {
    logger.warn('notification.failed', { type, message: err.message });
  }
}

async function party(booking) {
  const user = await User.findById(booking.userId);
  const ride = await Ride.findById(booking.rideId);
  const driver = ride ? await Driver.findById(ride.driverId) : null;
  const driverUser = driver ? await User.findById(driver.userId) : null;
  return { user, driverUser, ride };
}

function line(booking, text) {
  return `${text}\n\nBooking ${booking.bookingNumber}\nAmount: ₹${booking.totalAmount}`;
}

export async function notifyBookingCreated(booking) {
  const { user, driverUser } = await party(booking);
  if (user) {
    await notifyUser({
      userId: user._id,
      bookingId: booking._id,
      type: 'BOOKING_CREATED',
      message: line(booking, 'Your booking was created. Pay the driver and upload the screenshot.'),
      email: user.email,
      phone: user.phone,
    });
  }
  if (driverUser) {
    await notifyUser({
      userId: driverUser._id,
      bookingId: booking._id,
      type: 'NEW_BOOKING',
      message: line(booking, 'A customer created a booking on your ride.'),
      email: driverUser.email,
      phone: driverUser.phone,
    });
  }
}

export async function notifyPaymentSubmitted(booking) {
  const { user, driverUser } = await party(booking);
  if (user) {
    await notifyUser({
      userId: user._id,
      bookingId: booking._id,
      type: 'PAYMENT_SUBMITTED',
      message: line(booking, 'Payment proof was submitted and is waiting for the driver.'),
      email: user.email,
      phone: user.phone,
    });
  }
  if (driverUser) {
    await notifyUser({
      userId: driverUser._id,
      bookingId: booking._id,
      type: 'PAYMENT_SUBMITTED',
      message: line(booking, 'A customer submitted payment proof for your review.'),
      email: driverUser.email,
      phone: driverUser.phone,
    });
  }
}

export async function notifyPaymentApproved(booking) {
  const { user } = await party(booking);
  if (!user) return;
  await notifyUser({
    userId: user._id,
    bookingId: booking._id,
    type: 'PAYMENT_APPROVED',
    message: line(booking, 'The driver approved your payment.'),
    email: user.email,
    phone: user.phone,
  });
  await notifyUser({
    userId: user._id,
    bookingId: booking._id,
    type: 'BOOKING_CONFIRMED',
    message: line(booking, 'Your booking is confirmed.'),
    email: user.email,
    phone: user.phone,
  });
}

export async function notifyPaymentRejected(booking) {
  const { user, driverUser } = await party(booking);
  if (user) {
    await notifyUser({
      userId: user._id,
      bookingId: booking._id,
      type: 'PAYMENT_REJECTED',
      message: line(booking, 'The driver rejected the payment proof. The seats were released.'),
      email: user.email,
      phone: user.phone,
    });
  }
  if (driverUser) {
    await notifyUser({
      userId: driverUser._id,
      bookingId: booking._id,
      type: 'BOOKING_CANCELLATION',
      message: line(booking, 'You rejected a payment and the booking was cancelled.'),
      email: driverUser.email,
    });
  }
}

export async function notifyBookingCancelled(booking) {
  const { user, driverUser } = await party(booking);
  if (user) {
    await notifyUser({
      userId: user._id,
      bookingId: booking._id,
      type: 'BOOKING_CANCELLED',
      message: line(booking, 'Your booking was cancelled.'),
      email: user.email,
      phone: user.phone,
    });
  }
  if (driverUser) {
    await notifyUser({
      userId: driverUser._id,
      bookingId: booking._id,
      type: 'BOOKING_CANCELLATION',
      message: line(booking, 'A booking on your ride was cancelled.'),
      email: driverUser.email,
    });
  }
}

export async function notifyRideCancelled(booking) {
  const { user, driverUser } = await party(booking);
  if (user) {
    await notifyUser({
      userId: user._id,
      bookingId: booking._id,
      type: 'RIDE_CANCELLED',
      message: line(booking, 'The ride was cancelled. A full refund obligation is recorded when you had paid.'),
      email: user.email,
      phone: user.phone,
    });
  }
  if (driverUser) {
    await notifyUser({
      userId: driverUser._id,
      bookingId: booking._id,
      type: 'RIDE_CANCELLATION',
      message: line(booking, 'This ride was cancelled.'),
      email: driverUser.email,
    });
  }
}

export async function notifyRefundUpdated(booking) {
  const { user } = await party(booking);
  if (!user) return;
  await notifyUser({
    userId: user._id,
    bookingId: booking._id,
    type: 'REFUND_STATUS_UPDATED',
    message: line(booking, `Refund status is now ${booking.refundStatus}. Amount recorded: ₹${booking.refundAmount}.`),
    email: user.email,
    phone: user.phone,
  });
}

export async function notifyUpcomingRide(driverUserId, ride) {
  const driverUser = await User.findById(driverUserId);
  if (!driverUser) return;
  await notifyUser({
    userId: driverUser._id,
    type: 'UPCOMING_RIDE',
    message: `Your ride is scheduled. Departure ${new Date(ride.departureTime).toISOString()}.`,
    email: driverUser.email,
    phone: driverUser.phone,
  });
}

export async function notifyRideActivated(driverUserId, ride) {
  const driverUser = await User.findById(driverUserId);
  if (!driverUser) return;
  const key = `RIDE_ACTIVATED:${ride._id}`;
  const existing = await Notification.findOne({ userId: driverUserId, type: key });
  if (existing) return existing;
  return notifyUser({
    userId: driverUser._id,
    type: key,
    message: `Ride is now active. Departure was ${new Date(ride.departureTime).toLocaleString()}.`,
    email: driverUser.email,
    phone: driverUser.phone,
  });
}

export async function notifyRideCompleted(driverUserId, ride) {
  const driverUser = await User.findById(driverUserId);
  if (!driverUser) return;
  const key = `RIDE_COMPLETED:${ride._id}`;
  const existing = await Notification.findOne({ userId: driverUserId, type: key });
  if (existing) return existing;
  return notifyUser({
    userId: driverUser._id,
    type: key,
    message: `Ride marked completed at ${new Date(ride.actualCompletedAt || Date.now()).toLocaleString()}.`,
    email: driverUser.email,
    phone: driverUser.phone,
  });
}

export async function notifyPassengerAdded(driverUserId, ride, passenger) {
  const driverUser = await User.findById(driverUserId);
  if (!driverUser) return;
  return notifyUser({
    userId: driverUser._id,
    type: 'PASSENGER_ADDED',
    message: `Passenger ${passenger.name} added to your ride (${passenger.seatCount} seat(s)).`,
    email: driverUser.email,
    phone: driverUser.phone,
  });
}

export async function listForUser(userId) {
  const notifications = await Notification.find({ userId, channel: NOTIFICATION_CHANNEL.IN_APP })
    .sort({ createdAt: -1 })
    .limit(100);
  return { notifications };
}

export async function markRead(userId, notificationId) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) return null;
  notification.read = true;
  await notification.save();
  return notification;
}

export { buildWhatsAppLink };
