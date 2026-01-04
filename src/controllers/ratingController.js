import { prisma } from "../config/db.js";

export const rateProvider = async (req, res) => {
  try {
    const { providerId, rating } = req.body;

    if (!providerId || typeof rating === "undefined") {
      return res.status(400).json({ success: false, message: "providerId and rating are required" });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: "rating must be an integer between 1 and 5" });
    }

    // Ensure provider exists (ServiceProvider.id)
    const provider = await prisma.serviceProvider.findUnique({ where: { id: Number(providerId) } });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const created = await prisma.rating.create({
      data: {
        userId: req.user.id,
        providerId: Number(providerId),
        rating: parsedRating,
      },
      select: {
        id: true,
        rating: true,
        userId: true,
        providerId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("rateProvider error:", err);

    // Prisma error when DB schema and generated client are out of sync
    if (err?.code === "P2022") {
      return res.status(500).json({
        success: false,
        message:
          "Database schema mismatch detected. Try running `npx prisma generate` and apply pending migrations (`npx prisma migrate deploy` or `npx prisma db push`). Check that the `Rating` table has a `rating` column.",
      });
    }

    return res.status(500).json({ success: false, message: "Server error while creating rating" });
  }
};
