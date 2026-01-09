import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";


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
      faydaId,     
      fanNumber,   
      verificationDoc,
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (!faydaId && !fanNumber) {
      return res.status(400).json({ message: "Either faydaId (FIN) or fanNumber (FAN) is required" });
    }
    if (faydaId && fanNumber) {
      return res.status(400).json({ message: "Provide either faydaId (FIN) or fanNumber (FAN), not both" });
    }

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
    const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    start.setUTCMonth(start.getUTCMonth() - (months - 1));

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
      ratings: { select: { rating: true, userId: true } },
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
    ratingsCount: p.ratings ? new Set(p.ratings.map((r) => r.userId)).size : 0,
    createdAt: p.createdAt,
  }));

  res.json(providers);
};

const getProvider = async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'Invalid provider id' });
  }

  // Try to fetch by serviceProvider.id first, then by userId
  let provider = await prisma.serviceProvider.findUnique({ where: { id: idNum }, include: { user: true, ratings: true } });
  if (!provider) {
    provider = await prisma.serviceProvider.findUnique({ where: { userId: idNum }, include: { user: true, ratings: true } });
  }

  if (!provider) {
    return res.status(404).json({ message: 'Provider not found' });
  }

  let avg = null;
  if (provider.ratings && provider.ratings.length) {
    const raw = provider.ratings.reduce((s, r) => s + r.rating, 0) / provider.ratings.length;
    avg = Number(raw.toFixed(1));
  }
  const ratingsCount = provider.ratings ? new Set(provider.ratings.map((r) => r.userId)).size : 0;

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
    ratingsCount,
    createdAt: provider.createdAt,
  });
};

const updateProvider = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'Invalid provider id' });
  }

  const { fullName, email, password } = req.body;
  const providerFields = (({ location, phone, bio, profileImage, serviceType, faydaId, fanNumber, verificationDoc }) => ({ location, phone, bio, profileImage, serviceType, faydaId, fanNumber, verificationDoc }))(req.body);

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
    let provider = await prisma.serviceProvider.findUnique({ where: { id: idNum } });
    if (!provider) provider = await prisma.serviceProvider.findUnique({ where: { userId: idNum } });

    if (!provider) {
      const existingUser = await prisma.user.findUnique({ where: { id: idNum } });
      if (!existingUser) return res.status(404).json({ message: 'Provider not found' });

      const newEmail = email ? String(email).trim() : null;
      if (newEmail) {
        const emailTaken = await prisma.user.findFirst({ where: { email: { equals: newEmail, mode: 'insensitive' } }, select: { id: true } });
        if (emailTaken && emailTaken.id !== existingUser.id) {
          return res.status(409).json({ message: 'Email already exists' });
        }
      }

      const updateUserData = {};
      if (fullName) updateUserData.fullName = fullName;
      if (newEmail) updateUserData.email = newEmail;
      if (password) updateUserData.password = await bcrypt.hash(password, 10);

      const updatedUser = await prisma.user.update({ where: { id: idNum }, data: updateUserData });
      return res.json({ message: 'User updated (no service profile existed)', user: updatedUser });
    }

    const userRecord = await prisma.user.findUnique({ where: { id: provider.userId }, select: { id: true, email: true } });
    const newEmail = email ? String(email).trim() : null;
    if (newEmail && userRecord) {
      const emailTaken = await prisma.user.findFirst({ where: { email: { equals: newEmail, mode: 'insensitive' } }, select: { id: true } });
      if (emailTaken && emailTaken.id !== userRecord.id) return res.status(409).json({ message: 'Email already exists' });
    }

    // Build tx updates
    const userUpdates = {};
    if (fullName) userUpdates.fullName = fullName;
    if (newEmail) userUpdates.email = newEmail;
    if (password) userUpdates.password = await bcrypt.hash(password, 10);

    if (providerFields.serviceType) {
      const normalized = normalizeServiceType(providerFields.serviceType);
      if (!normalized) return res.status(400).json({ message: 'Invalid serviceType' });
      providerFields.serviceType = normalized;
    }

    Object.keys(providerFields).forEach((k) => providerFields[k] === undefined && delete providerFields[k]);
   
    const [updatedUser, updatedProvider] = await prisma.$transaction([
      prisma.user.update({ where: { id: provider.userId }, data: userUpdates }),
      prisma.serviceProvider.update({ where: { id: provider.id }, data: providerFields }),
    ]);

    return res.json({ user: updatedUser, provider: updatedProvider });
  } catch (err) {
    console.error('updateProvider error:', err);
    
    if (err?.code === 'P2002' && err?.meta?.modelName === 'User') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    return res.status(500).json({ message: 'Error updating provider' });
  }
};

const deleteProvider = async (req, res) => {
  const { id } = req.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'Invalid provider id' });
  }

  try {
    let provider = await prisma.serviceProvider.findUnique({ where: { id: idNum } });

    if (!provider) {
      provider = await prisma.serviceProvider.findUnique({ where: { userId: idNum } });
    }

    if (!provider) {
      const user = await prisma.user.findUnique({ where: { id: idNum } });
      if (!user || user.role !== 'PROVIDER') {
        return res.status(404).json({ message: 'Provider not found' });
      }

      provider = await prisma.serviceProvider.findUnique({ where: { userId: user.id } });
      if (!provider) {
        await prisma.user.delete({ where: { id: user.id } });
        return res.json({ message: 'Provider user deleted' });
      }
    }

    // Delete dependent records in a transaction: ratings, messages, serviceProvider, then user
    await prisma.$transaction(async (tx) => {
      await tx.rating.deleteMany({ where: { providerId: provider.id } });
      await tx.message.deleteMany({ where: { OR: [{ senderId: provider.userId }, { receiverId: provider.userId }] } });
      await tx.serviceProvider.delete({ where: { id: provider.id } });
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