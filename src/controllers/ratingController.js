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
    const idNum = Number(providerId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid provider id" });
    }

    let provider = await prisma.serviceProvider.findUnique({ where: { id: idNum } });
    if (!provider) {
      provider = await prisma.serviceProvider.findUnique({ where: { userId: idNum } });
    }

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const created = await prisma.rating.create({
      data: {
        userId: req.user.id,
        providerId: provider.id,
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
    const rows = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT("userId"))::int as cnt
      FROM "Rating"
      WHERE "providerId" = ${provider.id}
    `;
    const ratingsCount = (rows && rows[0] && Number(rows[0].cnt)) || 0;

    const avgRows = await prisma.$queryRaw`
      SELECT AVG(sub.rating)::float as avg
      FROM (
        SELECT DISTINCT ON ("userId") rating
        FROM "Rating"
        WHERE "providerId" = ${provider.id}
        ORDER BY "userId", "createdAt" DESC
      ) sub
    `;
    const averageRating =
      avgRows && avgRows[0] && typeof avgRows[0].avg !== "undefined" && avgRows[0].avg !== null
        ? Number(Number(avgRows[0].avg).toFixed(1))
        : null;

    try {
      await prisma.serviceProvider.update({
        where: { id: provider.id },
        data: { averageRating: averageRating, ratingsCount: ratingsCount },
      });
    } catch (updateErr) {
      console.error("Failed to update provider rating metrics:", updateErr);
    }

    return res.status(201).json({ success: true, data: created, ratingsCount, averageRating });
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
