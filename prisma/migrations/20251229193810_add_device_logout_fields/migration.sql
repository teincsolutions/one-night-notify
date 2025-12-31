-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "loggedOutAt" TIMESTAMP(3);
