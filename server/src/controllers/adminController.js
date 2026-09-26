import * as userAdminService from '../services/userAdminService.js';
import * as driverService from '../services/driverService.js';
import * as vehicleService from '../services/vehicleService.js';
import * as routeService from '../services/routeService.js';
import * as rideService from '../services/rideService.js';
import * as bookingService from '../services/bookingService.js';
import * as paymentService from '../services/paymentService.js';
import * as reportService from '../services/reportService.js';
import * as auditService from '../services/auditService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const dashboard = asyncHandler(async (req, res) => {
  const data = await reportService.dashboard();
  success(res, { message: 'Admin dashboard fetched', data });
});

// Users
export const listUsers = asyncHandler(async (req, res) => {
  const data = await userAdminService.listUsers(req.query);
  success(res, { message: 'Users fetched', data });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userAdminService.getUser(req.params.id);
  success(res, { message: 'User fetched', data: { user } });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await userAdminService.updateUserStatus(req.params.id, req.body.status, req.user);
  success(res, { message: 'User status updated', data: { user } });
});

// Drivers
export const listDrivers = asyncHandler(async (req, res) => {
  const data = await driverService.listDrivers(req.query);
  success(res, { message: 'Drivers fetched', data });
});

export const createDriver = asyncHandler(async (req, res) => {
  const driver = await driverService.createDriver(req.body, req.user);
  success(res, { message: 'Driver created', data: { driver }, statusCode: 201 });
});

export const getDriver = asyncHandler(async (req, res) => {
  const driver = await driverService.getDriver(req.params.id);
  success(res, { message: 'Driver fetched', data: { driver } });
});

export const updateDriver = asyncHandler(async (req, res) => {
  const driver = await driverService.updateDriver(req.params.id, req.body, req.user);
  success(res, { message: 'Driver updated', data: { driver } });
});

// Vehicles
export const listVehicles = asyncHandler(async (req, res) => {
  const data = await vehicleService.listVehicles(req.query);
  success(res, { message: 'Vehicles fetched', data });
});

export const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.body, req.user);
  success(res, { message: 'Vehicle created', data: { vehicle }, statusCode: 201 });
});

export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicle(req.params.id);
  success(res, { message: 'Vehicle fetched', data: { vehicle } });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.body, req.user);
  success(res, { message: 'Vehicle updated', data: { vehicle } });
});

// Routes
export const listRoutes = asyncHandler(async (req, res) => {
  const data = await routeService.listRoutes(req.query);
  success(res, { message: 'Routes fetched', data });
});

export const createRoute = asyncHandler(async (req, res) => {
  const route = await routeService.createRoute(req.body, req.user);
  success(res, { message: 'Route created', data: { route }, statusCode: 201 });
});

export const updateRoute = asyncHandler(async (req, res) => {
  const route = await routeService.updateRoute(req.params.id, req.body, req.user);
  success(res, { message: 'Route updated', data: { route } });
});

// Rides
export const listRides = asyncHandler(async (req, res) => {
  const data = await rideService.listRidesAdmin(req.query);
  success(res, { message: 'Rides fetched', data });
});

export const createRide = asyncHandler(async (req, res) => {
  const ride = await rideService.createRide(req.body, req.user);
  success(res, { message: 'Ride created', data: { ride }, statusCode: 201 });
});

export const getRide = asyncHandler(async (req, res) => {
  const ride = await rideService.getRideAdmin(req.params.id);
  success(res, { message: 'Ride fetched', data: { ride } });
});

export const updateRide = asyncHandler(async (req, res) => {
  const ride = await rideService.updateRide(req.params.id, req.body, req.user);
  success(res, { message: 'Ride updated', data: { ride } });
});

export const cancelRide = asyncHandler(async (req, res) => {
  const ride = await rideService.cancelRide(req.params.id, req.user, req.body?.reason);
  success(res, { message: 'Ride cancelled', data: { ride } });
});

// Bookings / Payments
export const listBookings = asyncHandler(async (req, res) => {
  const data = await bookingService.listAllAdmin(req.query);
  success(res, { message: 'Bookings fetched', data });
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.getById(req.params.id, req.user);
  success(res, { message: 'Booking fetched', data: { booking } });
});

export const listPayments = asyncHandler(async (req, res) => {
  const data = await paymentService.listPaymentsAdmin(req.query);
  success(res, { message: 'Payments fetched', data });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentAdmin(req.params.id);
  success(res, { message: 'Payment fetched', data: { payment } });
});

// Reports
export const revenueReport = asyncHandler(async (req, res) => {
  const data = await reportService.revenueReport(req.query);
  success(res, { message: 'Revenue report fetched', data });
});

export const bookingsReport = asyncHandler(async (req, res) => {
  const data = await reportService.bookingsReport(req.query);
  success(res, { message: 'Bookings report fetched', data });
});

export const ridesReport = asyncHandler(async (req, res) => {
  const data = await reportService.ridesReport(req.query);
  success(res, { message: 'Rides report fetched', data });
});

// Audit
export const listAuditLogs = asyncHandler(async (req, res) => {
  const data = await auditService.listAuditLogs({
    ...req.query,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 50,
  });
  success(res, { message: 'Audit logs fetched', data });
});
