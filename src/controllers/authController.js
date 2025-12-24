import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import generateToken from "../utils/generateToken.js";


/**
 * USER REGISTRATION (Service Seeker)
 */
const registerUser = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      console.warn("registerUser: empty request body", {
        path: req.path,
        headers: req.headers["content-type"],
      });
      return res.status(400).json({
        message:
          "Request body is missing. Make sure you're sending JSON and set Content-Type: application/json",
      });
    }

    // Accept both `name` and `fullName` from clients
    const { name, fullName: fullNameFromBody, email, password } = req.body;
    const fullName = fullNameFromBody || name;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields: fullName, email, password" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: "USER",
      },
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("registerUser error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * LOGIN (Admin, Provider, User)
 */
const login = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      console.warn("login: empty request body", {
        path: req.path,
        headers: req.headers["content-type"],
      });
      return res.status(400).json({
        message:
          "Request body is missing. Make sure you're sending JSON and set Content-Type: application/json",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields: email, password" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user, res);

    res.json({
      message: "Login successful",
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      token, // returned for clients that prefer Authorization: Bearer <token>
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * CHANGE PASSWORD (First login for providers)
 */
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Old password incorrect" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  });

  res.json({ message: "Password changed successfully" });
};

/**
 * GET PROFILE (Provider)
 */
const getProfile = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { serviceProvider: true },
  });

  if (!user || user.role !== "PROVIDER") {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.serviceProvider?.phone,
    location: user.serviceProvider?.location,
    serviceType: user.serviceProvider?.serviceType,
    bio: user.serviceProvider?.bio,
    faydaId: user.serviceProvider?.faydaId,
    verificationDoc: user.serviceProvider?.verificationDoc,
  });
};

/**
 * LOGOUT
 * (Client deletes token – backend confirms)
 */
const logout = (req, res) => {
  try {
    const role = req.body?.role || req.query?.role;

    if (role) {
      const cookieName = `jwt_${String(role).toLowerCase()}`;
      res.clearCookie(cookieName);

      // If generic jwt exists and belongs to the same role, clear it as well
      const generic = req.cookies?.jwt;
      if (generic) {
        try {
          const decoded = jwt.verify(generic, process.env.JWT_SECRET);
          if (decoded.role && String(decoded.role).toLowerCase() === String(role).toLowerCase()) {
            res.clearCookie('jwt');
          }
        } catch (e) {
          // ignore verification errors
        }
      }

      return res.json({ message: `Logged out ${role} successfully` });
    }

    // No role provided: fallback to clearing all jwt cookies (legacy behavior)
    res.clearCookie('jwt');
    Object.keys(req.cookies || {})
      .filter((k) => k.startsWith('jwt_'))
      .forEach((k) => res.clearCookie(k));

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('logout error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export {registerUser, login, changePassword, logout, getProfile};