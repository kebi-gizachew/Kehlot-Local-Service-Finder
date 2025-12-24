import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcrypt";

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL while seeding. Ensure .env exists and has DATABASE_URL");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const adminEmail = "admin@kihlot.com";
  const adminPassword = "Admin@123"; // initial password (can be changed later)

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Admin already exists. Skipping admin seed.");
    return;
  }

  // Hash admin password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create admin user
  await prisma.user.create({
    data: {
      fullName: "Kihlot System Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  console.log("Admin account seeded successfully.");
  console.log("Email:", adminEmail);
  console.log("Password:", adminPassword);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
