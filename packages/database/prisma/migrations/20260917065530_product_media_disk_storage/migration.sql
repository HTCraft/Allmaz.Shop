/*
  Warnings:

  - You are about to drop the column `data` on the `ProductMedia` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `ProductMedia` table. All the data in the column will be lost.
  - Made the column `url` on table `ProductMedia` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProductMedia" DROP COLUMN "data",
DROP COLUMN "mimeType",
ALTER COLUMN "url" SET NOT NULL;
