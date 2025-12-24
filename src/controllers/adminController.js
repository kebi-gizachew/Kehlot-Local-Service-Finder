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
      faydaId,
      verificationDoc,
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
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
        faydaId,
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

export {registerProvider};