/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - The `id` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Movie` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WatchlistItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PROVIDER', 'USER');

-- DropForeignKey
ALTER TABLE "Movie" DROP CONSTRAINT "Movie_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "WatchlistItem" DROP CONSTRAINT "WatchlistItem_movieId_fkey";

-- DropForeignKey
ALTER TABLE "WatchlistItem" DROP CONSTRAINT "WatchlistItem_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "name",
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "Role" NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "Movie";

-- DropTable
DROP TABLE "WatchlistItem";

-- DropEnum
DROP TYPE "WatchlistStatus";

-- CreateTable
CREATE TABLE "ServiceProvider" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "serviceType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "faydaId" TEXT NOT NULL,
    "verificationDoc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProvider_userId_key" ON "ServiceProvider"("userId");

-- AddForeignKey
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
