import jwt from "jsonwebtoken";

/**
 * Extracts the JWT from (in order of priority):
 *  1. HttpOnly cookie named "token"  — preferred, XSS-safe transport
 *  2. Authorization: Bearer <token>  — legacy / ESP32 / API-key clients
 */
const extractToken = (req) => {
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return null;
};

export const verifyToken = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ error: "Forbidden." });
  }
  return next();
};

export const requireAnyRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden." });
  }
  return next();
};