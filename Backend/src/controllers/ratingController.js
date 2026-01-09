import {prisma} from '../config/db.js'
import bcrypt from 'bcrypt'
export const rateProvider = async (req, res) => {
  const userId = req.user.id;
  const { providerId, rating } = req.body;

  if (!providerId || !rating) {
    return res.status(400).json({ message: "Provider and rating are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingRating = await tx.rating.findUnique({
        where: {
          userId_providerId: {
            userId,
            providerId
          }
        }
      });

      let ratingRecord;

      if (existingRating) {
        ratingRecord = await tx.rating.update({
          where: { id: existingRating.id },
          data: { rating }
        });
      } else {
        ratingRecord = await tx.rating.create({
          data: {
            rating,
            userId,
            providerId
          }
        });
      }

      const stats = await tx.rating.aggregate({
        where: { providerId },
        _avg: { rating: true },
        _count: { rating: true }
      });

      await tx.serviceProvider.update({
        where: { id: providerId },
        data: {
          averageRating: stats._avg.rating || 0,
          totalRatings: stats._count.rating
        }
      });

      return ratingRecord;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to rate provider" });
  }
}
export const getProviderRatings = async (req, res) => {
  const { providerId } = req.params;

  try {
    const ratings = await prisma.rating.findMany({
      where: { providerId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch ratings" });
  }
}
export const getMyRating = async (req, res) => {
  const userId = req.user.id;
  const { providerId } = req.params;

  try {
    const rating = await prisma.rating.findUnique({
      where: {
        userId_providerId: {
          userId,
          providerId
        }
      }
    });

    res.json(rating || null);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rating" });
  }
}
export const deleteMyRating = async (req, res) => {
  const userId = req.user.id;
  const { providerId } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rating.delete({
        where: {
          userId_providerId: {
            userId,
            providerId
          }
        }
      });

      const stats = await tx.rating.aggregate({
        where: { providerId },
        _avg: { rating: true },
        _count: { rating: true }
      });

      await tx.serviceProvider.update({
        where: { id: providerId },
        data: {
          averageRating: stats._avg.rating || 0,
          totalRatings: stats._count.rating
        }
      });
    });

    res.json({ message: "Rating deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete rating" });
  }
}

export const getAllRatings = async (req, res) => {
  try {
    const ratings = await prisma.rating.findMany({
      include: {
        user: { select: { name: true, email: true } },
        provider: { select: { name: true } }
      }
    });

    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch ratings" });
  }
}



