export const getProfile = async (req, res) => {
  const provider = await prisma.serviceProvider.findUnique({
    where: { userId: req.user.id },
    select: {
      serviceType: true,
      location: true,
      phone: true,
      bio: true,
      profileImage: true, 
    },
  });

  res.json(provider);
};
