import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

/**
 * ADMIN REGISTERS SERVICE PROVIDER
 */
const registerProvider = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      location,
      serviceType,
      bio,
      profileImage,
      faydaId,     // FIN identifier
      fanNumber,   // FAN identifier
      verificationDoc,
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Validate identification: allow either FIN (faydaId) or FAN (fanNumber), not both
    if (!faydaId && !fanNumber) {
      return res.status(400).json({ message: "Either faydaId (FIN) or fanNumber (FAN) is required" });
    }
    if (faydaId && fanNumber) {
      return res.status(400).json({ message: "Provide either faydaId (FIN) or fanNumber (FAN), not both" });
    }

    // Normalize service type input to match enum labels
    const normalizeServiceType = (input) => {
      if (!input) return null;
      const s = String(input).toLowerCase();
      if (s.includes('electric')) return 'ELECTRICIAN';
      if (s.includes('mechanic')) return 'MECHANIC';
      if (s.includes('clean')) return 'CLEANER';
      if (s.includes('paint')) return 'PAINTING_CONTRACTOR';
      if (s.includes('carpent')) return 'CARPENTER';
      if (s.includes('plumb')) return 'PLUMBER';
      return null;
    };

    const normalizedServiceType = normalizeServiceType(serviceType);
    if (!normalizedServiceType) {
      return res.status(400).json({ message: 'Invalid serviceType. Valid options: Electrician, Mechanic, Cleaner, Painting Contractor, Carpenter, Plumber' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: "PROVIDER",
        mustChangePassword: true,
      },
    });

    await prisma.serviceProvider.create({
      data: {
        userId: user.id,
        phone,
        location,
        serviceType: normalizedServiceType,
        bio,
        profileImage,
        // store either FIN (faydaId) or FAN (fanNumber) into the existing `faydaId` column
        faydaId: faydaId || fanNumber,
        verificationDoc,
      },
    });

    res.status(201).json({
      message: "Service provider registered successfully",
      temporaryPassword: tempPassword,
    });
  } catch (err) {
    console.error('registerProvider error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const dashboardStats = async (req, res) => {
  try {
    const users = await prisma.user.count({ where: { role: "USER" } });
    const providers = await prisma.user.count({ where: { role: "PROVIDER" } });

    // Calculate overall average rating across all provider ratings (rounded to 1 decimal)
    const avgObj = await prisma.rating.aggregate({ _avg: { rating: true } });
    const averageRating = avgObj && avgObj._avg && avgObj._avg.rating != null ? Number(avgObj._avg.rating.toFixed(1)) : null;

    res.json({ users, providers, averageRating });
  } catch (err) {
    console.error('dashboardStats error:', err);
    res.status(500).json({ message: 'Failed to load dashboard data' });
  }
};

const getUserGrowth = async (req, res) => {
  try {
    // Accept ?months=N (1-24) - default 6 months
    const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);

    // Calculate start month (first day of earliest month we want)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    start.setUTCMonth(start.getUTCMonth() - (months - 1));

    // Query aggregated counts grouped by month
    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") AS mth,
        SUM(CASE WHEN role = 'USER' THEN 1 ELSE 0 END)::int AS users,
        SUM(CASE WHEN role = 'PROVIDER' THEN 1 ELSE 0 END)::int AS providers,
        COUNT(*)::int AS total
      FROM "User"
      WHERE role IN ('USER', 'PROVIDER') AND DATE_TRUNC('month', "createdAt") >= ${start}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt");
    `;

    // Map results by readable month label
    const map = new Map();
    rows.forEach((r) => {
      const dt = new Date(r.mth);
      const label = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      map.set(label, { users: r.users, providers: r.providers, total: r.total });
    });

    // Build zero-filled series for requested months
    const result = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const values = map.get(label) || { users: 0, providers: 0, total: 0 };
      result.push({ month: label, ...values });
    }

    res.json(result);
  } catch (error) {
    console.error('getUserGrowth error:', error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
};

const listProviders = async (req, res) => {
  const providersRaw = await prisma.serviceProvider.findMany({
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const providers = providersRaw.map((p) => ({
    id: p.user.id,
    fullName: p.user.fullName,
    email: p.user.email,
    serviceType: p.serviceType,
    location: p.location,
    bio: p.bio,
    profileImage: p.profileImage,
    createdAt: p.createdAt,
  }));

  res.json(providers);
};

const getProvider = async (req, res) => {
  const idNum = Number(req.params.id);

  // Try to fetch by serviceProvider.id first, then by userId
  let provider = await prisma.serviceProvider.findUnique({ where: { id: idNum }, include: { user: true, ratings: true } });
  if (!provider) {
    provider = await prisma.serviceProvider.findUnique({ where: { userId: idNum }, include: { user: true, ratings: true } });
  }

  if (!provider) {
    return res.status(404).json({ message: 'Provider not found' });
  }

  // Compute provider average rating rounded to 1 decimal place when available
  let avg = null;
  if (provider.ratings && provider.ratings.length) {
    const raw = provider.ratings.reduce((s, r) => s + r.rating, 0) / provider.ratings.length;
    avg = Number(raw.toFixed(1));
  }

  return res.json({
    id: provider.id,
    userId: provider.userId,
    fullName: provider.user?.fullName || null,
    email: provider.user?.email || null,
    serviceType: provider.serviceType,
    location: provider.location,
    phone: provider.phone,
    bio: provider.bio,
    profileImage: provider.profileImage,
    faydaId: provider.faydaId,
    verificationDoc: provider.verificationDoc,
    averageRating: avg,
    createdAt: provider.createdAt,
  });
};

const updateProvider = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);

  // Separate user and provider fields
  const { fullName, email, password } = req.body;
  const providerFields = (({ location, phone, bio, profileImage, serviceType, faydaId, fanNumber, verificationDoc }) => ({ location, phone, bio, profileImage, serviceType, faydaId, fanNumber, verificationDoc }))(req.body);

  // Normalize serviceType if provided
  // Ensure at most one of faydaId (FIN) or fanNumber (FAN) is present; map fanNumber into faydaId for storage
  if (providerFields.faydaId && providerFields.fanNumber) {
    return res.status(400).json({ message: 'Provide either faydaId (FIN) or fanNumber (FAN), not both' });
  }
  if (providerFields.fanNumber && !providerFields.faydaId) {
    providerFields.faydaId = providerFields.fanNumber;
  }
  // remove fanNumber after mapping
  delete providerFields.fanNumber;
  const normalizeServiceType = (input) => {
    if (!input) return null;
    const s = String(input).toLowerCase();
    if (s.includes('electric')) return 'ELECTRICIAN';
    if (s.includes('mechanic')) return 'MECHANIC';
    if (s.includes('clean')) return 'CLEANER';
    if (s.includes('paint')) return 'PAINTING_CONTRACTOR';
    if (s.includes('carpent')) return 'CARPENTER';
    if (s.includes('plumb')) return 'PLUMBER';
    return null;
  };

  try {
    // Find provider record by serviceProvider.id or userId
    let provider = await prisma.serviceProvider.findUnique({ where: { id: idNum } });
    if (!provider) provider = await prisma.serviceProvider.findUnique({ where: { userId: idNum } });

    if (!provider) {
      // If there's no provider record, attempt to update user only (may be a user id)
      const existingUser = await prisma.user.findUnique({ where: { id: idNum } });
      if (!existingUser) return res.status(404).json({ message: 'Provider not found' });

      const updateUserData = {};
      if (fullName) updateUserData.fullName = fullName;
      if (email) updateUserData.email = email;
      if (password) updateUserData.password = await bcrypt.hash(password, 10);

      const updatedUser = await prisma.user.update({ where: { id: idNum }, data: updateUserData });
      return res.json({ message: 'User updated (no service profile existed)', user: updatedUser });
    }

    // Build tx updates
    const userUpdates = {};
    if (fullName) userUpdates.fullName = fullName;
    if (email) userUpdates.email = email;
    if (password) userUpdates.password = await bcrypt.hash(password, 10);

    // Normalize serviceType if present
    if (providerFields.serviceType) {
      const normalized = normalizeServiceType(providerFields.serviceType);
      if (!normalized) return res.status(400).json({ message: 'Invalid serviceType' });
      providerFields.serviceType = normalized;
    }

    // Remove undefined provider fields
    Object.keys(providerFields).forEach((k) => providerFields[k] === undefined && delete providerFields[k]);

    // Apply updates in a transaction
    const [updatedUser, updatedProvider] = await prisma.$transaction([
      prisma.user.update({ where: { id: provider.userId }, data: userUpdates }),
      prisma.serviceProvider.update({ where: { id: provider.id }, data: providerFields }),
    ]);

    return res.json({ user: updatedUser, provider: updatedProvider });
  } catch (err) {
    console.error('updateProvider error:', err);
    return res.status(500).json({ message: 'Error updating provider' });
  }
};

const deleteProvider = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);

  try {
    // Find the service provider by either serviceProvider.id or by userId
    let provider = await prisma.serviceProvider.findUnique({ where: { id: idNum } });

    if (!provider) {
      // Try to find by userId
      provider = await prisma.serviceProvider.findUnique({ where: { userId: idNum } });
    }

    if (!provider) {
      // If still not found, check if the user exists and is a provider
      const user = await prisma.user.findUnique({ where: { id: idNum } });
      if (!user || user.role !== 'PROVIDER') {
        return res.status(404).json({ message: 'Provider not found' });
      }
      // Find provider by userId (should exist, but double-check)
      provider = await prisma.serviceProvider.findUnique({ where: { userId: user.id } });
      if (!provider) {
        // If no serviceProvider record, just delete the user
        await prisma.user.delete({ where: { id: user.id } });
        return res.json({ message: 'Provider user deleted' });
      }
    }

    // Delete dependent records in a transaction: ratings, messages, serviceProvider, then user
    await prisma.$transaction(async (tx) => {
      // Delete ratings for this provider
      await tx.rating.deleteMany({ where: { providerId: provider.id } });

      // Delete messages where sender or receiver is the provider's user
      await tx.message.deleteMany({ where: { OR: [{ senderId: provider.userId }, { receiverId: provider.userId }] } });

      // Delete service provider record
      await tx.serviceProvider.delete({ where: { id: provider.id } });

      // Finally delete user
      await tx.user.delete({ where: { id: provider.userId } });
    });

    return res.json({ message: 'Provider and related data deleted' });
  } catch (err) {
    console.error('deleteProvider error:', err);
    return res.status(500).json({ message: 'Error deleting provider' });
  }
};


const listUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      createdAt: true,
    },
  });

  res.json(users);
};

export {registerProvider, dashboardStats, getUserGrowth, listProviders, getProvider, updateProvider, deleteProvider, listUsers};