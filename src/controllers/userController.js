import { prisma } from "../config/db.js";

/* Providers by category */
const getProvidersByCategory = async (req, res) => {
  const { serviceType } = req.params;
  const { location } = req.query;

  if (!serviceType) {
    return res.status(400).json({ success: false, message: 'Service type is required' });
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
    return res.status(400).json({ success: false, message: 'Invalid service type' });
  }

  const where = { serviceType: normalized };
  if (location) where.location = { contains: String(location), mode: 'insensitive' };

  const providersRaw = await prisma.serviceProvider.findMany({
    where,
    include: { user: { select: { fullName: true, email: true } }, ratings: true },
    orderBy: { createdAt: 'desc' },
  });

  const providers = providersRaw.map((p) => ({
    id: p.id,
    fullName: p.user?.fullName || null,
    email: p.user?.email || null,
    serviceType: p.serviceType,
    location: p.location,
    bio: p.bio,
    phone: p.phone,
    profileImage: p.profileImage,
    averageRating: p.ratings && p.ratings.length ? p.ratings.reduce((s, r) => s + r.rating, 0) / p.ratings.length : null,
    createdAt: p.createdAt,
  }));

  res.json({ success: true, count: providers.length, data: providers });
};

/* Search providers by location */
const searchProviders = async (req, res) => {
  const { location } = req.query;

  const providers = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      location: {
        contains: location,
        mode: "insensitive",
      },
    },
  });

  res.json(providers);
};

/* Provider profile */
const getProviderProfile = async (req, res) => {
  const { id } = req.params;

  const provider = await prisma.user.findUnique({
    where: { id: Number(id) },
  });

  res.json(provider);
};

export {getProvidersByCategory, searchProviders, getProviderProfile};
