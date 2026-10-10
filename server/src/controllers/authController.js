import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  success(res, { message: 'Registered successfully', data, statusCode: 201 });
});

export const registerDriver = asyncHandler(async (req, res) => {
  const data = await authService.registerDriver(req.body);
  success(res, { message: 'Driver registered successfully', data, statusCode: 201 });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  success(res, { message: 'Logged in successfully', data });
});

export const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refresh(req.body.refreshToken);
  success(res, { message: 'Token refreshed', data });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id, req.body?.refreshToken);
  success(res, { message: 'Logged out successfully', data: {} });
});

export const me = asyncHandler(async (req, res) => {
  const data = await authService.me(req.user._id);
  success(res, { message: 'Profile fetched', data });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await authService.updateProfile(req.user._id, req.body);
  success(res, { message: 'Profile updated successfully', data });
});
