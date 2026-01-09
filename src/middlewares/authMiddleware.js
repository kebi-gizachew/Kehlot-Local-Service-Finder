import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

const authenticate = (req, res, next) => {
  const cookies = req.cookies || {};
  let token = cookies.jwt;

  if (!token) {
    for (const [name, value] of Object.entries(cookies)) {
      if (name.startsWith('jwt_')) {
        token = value;
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const protect = async (req, res, next) => {
  let token = req.cookies?.jwt;

  if (!token) {
    const auth = req.headers.authorization;
    if (auth && typeof auth === 'string') {
      const parts = auth.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
    }
  }

  if (!token) return res.status(401).json({ message: "Not authorized: missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      console.warn('protect: token decoded but missing id', decoded);
      return res.status(401).json({ message: 'Not authorized: invalid token payload' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: { id: true, role: true, mustChangePassword: true },
    });

    if (!user) {
      console.warn(`protect: user not found for id ${decoded.id}`);
      return res.status(401).json({ message: "Not authorized" });
    }

    req.user = user;

    next();
  } catch (error) {
    // Provide clearer messages for common JWT errors
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error?.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('protect middleware unexpected error:', error);
    return res.status(401).json({ message: 'Authentication error' });
  }
};

export {authenticate, protect};