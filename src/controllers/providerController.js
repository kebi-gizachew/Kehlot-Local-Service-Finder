import { prisma } from "../config/db.js";

export const getProvidersByCategory = async (req, res) => {
  const serviceType = req.params.category || req.params.serviceType;
  const providersRaw = await prisma.serviceProvider.findMany({
    where: { serviceType },
    include: { user: { select: { fullName: true } } },
  });

  const providers = providersRaw.map((p) => ({
    id: p.id,
    fullName: p.user?.fullName || null,
    location: p.location,
    bio: p.bio,
    profileImage: p.profileImage,
  }));

  res.json(providers);
};

export const getProviderProfile = async (req, res) => {
  try{
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: Number(req.params.id) },
      include: { ratings: true, user: { select: { fullName: true } } }
    });
    
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    const ratings = provider.ratings.map(r => r.rating);
    const averageRating = ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0;

    res.status(200).json({
        id: provider.id,
        fullName: provider.user?.fullName || null,
        serviceType: provider.serviceType,
        location: provider.location,
        phone: provider.phone,
        bio: provider.bio,
        profileImage: provider.profileImage,
        averageRating
      });
  }catch (error) {
    res.status(500).json({ error: error.message });
  }
};

