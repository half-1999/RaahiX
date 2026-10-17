import { User } from '../models/User.js';
import { Driver } from '../models/Driver.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Vehicle } from '../models/Vehicle.js';
import {
  BOOKING_STATUS,
  DRIVER_VERIFICATION,
  PAYMENT_STATUS,
  PROOF_STATUS,
  REFUND_STATUS,
  RIDE_STATUS,
  ROLES,
  VEHICLE_STATUS,
} from '../constants/enums.js';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function dashboard() {
  const from = startOfToday();
  const to = endOfToday();

  const [
    users,
    drivers,
    ridesToday,
    bookingsToday,
    revenueAgg,
    pendingPayments,
    customers,
    verifiedDrivers,
    activeVehicles,
    upcomingRides,
    pendingBookings,
    pendingProofs,
    pendingRefunds,
  ] = await Promise.all([
    User.countDocuments(),
    Driver.countDocuments(),
    Ride.countDocuments({
      departureTime: { $gte: from, $lte: to },
      voidedAt: null,
    }),
    Booking.countDocuments({
      createdAt: { $gte: from, $lte: to },
    }),
    Payment.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.SUCCESS,
          paidAt: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.countDocuments({
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
    }),
    User.countDocuments({ role: ROLES.CUSTOMER }),
    Driver.countDocuments({ verificationStatus: DRIVER_VERIFICATION.VERIFIED }),
    Vehicle.countDocuments({ status: VEHICLE_STATUS.ACTIVE }),
    Ride.countDocuments({
      departureTime: { $gt: to },
      voidedAt: null,
    }),
    Booking.countDocuments({ bookingStatus: BOOKING_STATUS.PENDING }),
    Booking.countDocuments({ proofStatus: PROOF_STATUS.SUBMITTED }),
    Booking.countDocuments({ refundStatus: REFUND_STATUS.PENDING }),
  ]);

  return {
    users,
    drivers,
    ridesToday,
    bookingsToday,
    revenueToday: revenueAgg[0]?.total || 0,
    pendingPayments,
    customers,
    verifiedDrivers,
    activeVehicles,
    upcomingRides,
    pendingBookings,
    pendingProofs,
    pendingRefunds,
  };
}

export async function revenueReport({ from, to } = {}) {
  const match = { status: PAYMENT_STATUS.SUCCESS };
  if (from || to) {
    match.paidAt = {};
    if (from) match.paidAt.$gte = new Date(from);
    if (to) match.paidAt.$lte = new Date(to);
  }

  const rows = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$paidAt' },
        },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const total = rows.reduce((sum, r) => sum + r.revenue, 0);
  return {
    from: from || null,
    to: to || null,
    total,
    daily: rows.map((r) => ({ date: r._id, revenue: r.revenue, payments: r.count })),
  };
}

export async function bookingsReport({ from, to, status } = {}) {
  const match = {};
  if (status) match.bookingStatus = status;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const [byStatus, total] = await Promise.all([
    Booking.aggregate([
      { $match: match },
      { $group: { _id: '$bookingStatus', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
    ]),
    Booking.countDocuments(match),
  ]);

  return {
    from: from || null,
    to: to || null,
    total,
    byStatus: byStatus.map((r) => ({
      status: r._id,
      count: r.count,
      amount: r.amount,
    })),
  };
}

export async function ridesReport({ from, to, status } = {}) {
  const match = {};
  if (status) match.status = status;
  if (from || to) {
    match.departureTime = {};
    if (from) match.departureTime.$gte = new Date(from);
    if (to) match.departureTime.$lte = new Date(to);
  }

  const [byStatus, total] = await Promise.all([
    Ride.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Ride.countDocuments(match),
  ]);

  return {
    from: from || null,
    to: to || null,
    total,
    byStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
  };
}
