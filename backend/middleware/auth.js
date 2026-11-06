/**
 * middleware/auth.js
 * JWT authentication and role-based access control middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes — verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Support Bearer token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user (exclude password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact admin.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired.' });
    }
    next(error);
  }
};

/**
 * Role-based authorization middleware factory
 * Usage: authorize('admin', 'manager')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedRoles = roles.map((r) => r.toLowerCase());

    // If admin or superadmin, always allow
    if (userRole === 'admin' || userRole === 'superadmin') {
      return next();
    }

    // Direct match (case-insensitive)
    if (normalizedRoles.includes(userRole)) {
      return next();
    }

    // In this ERP app, if route allows manager or employee, allow staff and employee roles
    const isGeneralManagement =
      normalizedRoles.includes('manager') ||
      normalizedRoles.includes('employee') ||
      normalizedRoles.includes('staff');

    if (isGeneralManagement && (userRole === 'manager' || userRole === 'employee' || userRole === 'staff')) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not authorized to access this route.`,
    });
  };
};

module.exports = { protect, authorize };
