import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import generateToken from "../utils/generateToken.js";


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

    // Query the user with a small retry on transient DB I/O errors (e.g., Neon adapter transient failures)
    let user = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        user = await prisma.user.findUnique({ where: { email } });
        break;
      } catch (dbErr) {
        console.error(`login: database lookup attempt ${attempt} failed:`, dbErr?.message || dbErr);
        if (attempt === 3) {
          console.error('login: final DB lookup error (full):', dbErr);
          return res.status(503).json({ message: 'Database temporarily unavailable. Please try again.' });
        }
        await new Promise((r) => setTimeout(r, 100 * attempt));
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user, res);

    // Build base response
    const response = {
      message: "Login successful",
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      token, // returned for clients that prefer Authorization: Bearer <token>
    };

    if (user.role === "PROVIDER") {
      try {
        const provider = await prisma.serviceProvider.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            serviceType: true,
            phone: true,
            location: true,
            bio: true,
            profileImage: true,
            faydaId: true,
            verificationDoc: true,
            averageRating: true,
            ratingsCount: true,
            createdAt: true,
          },
        });

        if (provider) {
          response.provider = provider;
        }
      } catch (err) {
        console.error("login: failed to load provider profile:", err);
      }
    }

    return res.json(response);
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

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


const getProviderProfile = async (req, res) => {
  try {
    // If a provider id param is present, fetch by ServiceProvider.id (public profile)
    const providerIdParam = req.params?.id;

    if (providerIdParam) {
      const idNum = Number(providerIdParam);
      if (!Number.isInteger(idNum) || idNum <= 0) {
        return res.status(400).json({ message: "Invalid provider id" });
      }

      const provider = await prisma.serviceProvider.findUnique({
        where: { id: idNum },
        select: { user: true, ratings: { select: { rating: true, userId: true } }, averageRating: true, ratingsCount: true },
      });

      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Prefer cached metrics when available, fall back to computing from ratings
      const avg = typeof provider.averageRating === 'number' && provider.averageRating !== null
        ? Number(provider.averageRating.toFixed(1))
        : (provider.ratings && provider.ratings.length ? Number((provider.ratings.reduce((s, r) => s + r.rating, 0) / provider.ratings.length).toFixed(1)) : null);

      const ratingsCount = typeof provider.ratingsCount === 'number' && provider.ratingsCount !== null
        ? provider.ratingsCount
        : (provider.ratings ? new Set(provider.ratings.map((r) => r.userId)).size : 0);

      return res.json({
        id: provider.id,
        fullName: provider.user?.fullName || null,
        email: provider.user?.email || null,
        phone: provider.phone,
        location: provider.location,
        serviceType: provider.serviceType,
        bio: provider.bio,
        profileImage: provider.profileImage,
        averageRating: avg,
        ratingsCount,
        createdAt: provider.createdAt,
      });
    }

    // Fallback: authenticated provider fetching their own profile
    if (!req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { serviceProvider: true },
    });

    if (!user || user.role !== "PROVIDER") {
      return res.status(403).json({ message: "Access denied" });
    }

    // If provider record exists, fetch cached metrics and return profile info
    let ratingsCountForSelf = 0;
    let avgForSelf = null;
    if (user.serviceProvider && user.serviceProvider.id) {
      try {
        const provider = await prisma.serviceProvider.findUnique({
          where: { id: user.serviceProvider.id },
          select: { averageRating: true, ratingsCount: true, phone: true, location: true, serviceType: true, bio: true, profileImage: true, faydaId: true, verificationDoc: true },
        });

        ratingsCountForSelf = typeof provider?.ratingsCount === 'number' ? provider.ratingsCount : 0;
        avgForSelf = typeof provider?.averageRating === 'number' && provider.averageRating !== null ? Number(provider.averageRating.toFixed(1)) : null;
      } catch (err) {
        console.error('getProviderProfile: failed to fetch provider metrics:', err);
      }
    }

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.serviceProvider?.phone,
      location: user.serviceProvider?.location,
      serviceType: user.serviceProvider?.serviceType,
      bio: user.serviceProvider?.bio,
      profileImage: user.serviceProvider?.profileImage,
      faydaId: user.serviceProvider?.faydaId,
      verificationDoc: user.serviceProvider?.verificationDoc,
      averageRating: avgForSelf,
      ratingsCount: ratingsCountForSelf,
    });
  } catch (err) {
    console.error("getProviderProfile error:", err);

    if (err?.code === "P2022") {
      return res.status(500).json({
        success: false,
        message:
          "Database schema mismatch detected while fetching provider profile. Try running `npx prisma generate` and apply pending migrations (`npx prisma migrate deploy` or `npx prisma migrate dev`) or `npx prisma db push`.",
      });
    }

    return res.status(500).json({ message: "Server error while fetching provider profile" });
  }
};

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


const getProvidersByCategory = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { location } = req.query;

    // Validate input
    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: "Service type is required",
      });
    }
    const normalized = String(serviceType).toUpperCase();
    const validTypes = [
      "ELECTRICIAN",
      "MECHANIC",
      "CLEANER",
      "PAINTING_CONTRACTOR",
      "CARPENTER",
      "PLUMBER",
    ];

    if (!validTypes.includes(normalized)) {
      return res.status(400).json({ success: false, message: "Invalid service type" });
    }

    const where = { serviceType: normalized };
    if (location) {
      where.location = { contains: String(location), mode: "insensitive" };
    }

    const providersRaw = await prisma.serviceProvider.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
        ratings: { select: { rating: true, userId: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to response shape and compute averageRating and ratingsCount
    const providers = providersRaw.map((p) => {
      const avg = p.ratings && p.ratings.length ? Number((p.ratings.reduce((s, r) => s + r.rating, 0) / p.ratings.length).toFixed(1)) : null;
      const ratingsCount = p.ratings ? new Set(p.ratings.map((r) => r.userId)).size : 0;

      return {
        id: p.id,
        fullName: p.user?.fullName || null,
        email: p.user?.email || null,
        serviceType: p.serviceType,
        location: p.location,
        bio: p.bio,
        phone: p.phone,
        profileImage: p.profileImage,
        averageRating: avg,
        ratingsCount,
        createdAt: p.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error) {
    console.error("Get providers by category error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching providers",
    });
  }
};

const filterProvidersByCategories = async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ success: false, message: "categories array is required" });
    }

    const validTypes = [
      "ELECTRICIAN",
      "MECHANIC",
      "CLEANER",
      "PAINTING_CONTRACTOR",
      "CARPENTER",
      "PLUMBER",
    ];

    const normalized = categories
      .map((c) => String(c).toUpperCase().trim())
      .filter((c) => validTypes.includes(c));

    if (normalized.length === 0) {
      return res.status(400).json({ success: false, message: "No valid categories provided" });
    }

    const providersRaw = await prisma.serviceProvider.findMany({
      where: { serviceType: { in: normalized } },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        ratings: { select: { rating: true, userId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const providers = providersRaw.map((p) => {
      const avg = p.ratings && p.ratings.length ? p.ratings.reduce((s, r) => s + r.rating, 0) / p.ratings.length : null;
      const ratingsCount = p.ratings ? new Set(p.ratings.map((r) => r.userId)).size : 0;

      return {
        id: p.user.id,
        fullName: p.user?.fullName || null,
        email: p.user?.email || null,
        serviceType: p.serviceType,
        location: p.location,
        bio: p.bio,
        phone: p.phone,
        profileImage: p.profileImage,
        averageRating: avg,
        ratingsCount,
        createdAt: p.createdAt,
      };
    });

    return res.status(200).json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    console.error('filterProvidersByCategories error:', error);
    return res.status(500).json({ success: false, message: "Server error while filtering providers" });
  }
};

export {registerUser, login, changePassword, logout, getProviderProfile, getProvidersByCategory, filterProvidersByCategories};