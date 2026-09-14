-- Removes the autopiac car-marketplace tables.
--
-- DESTRUCTIVE: this permanently drops every row in Listing, ListingPhoto,
-- Favorite and SavedSearch. Back these tables up before deploying if any of
-- the data still matters. User rows are kept — the studio signs in with them.

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_userId_fkey";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "ListingPhoto" DROP CONSTRAINT "ListingPhoto_listingId_fkey";

-- DropForeignKey
ALTER TABLE "SavedSearch" DROP CONSTRAINT "SavedSearch_userId_fkey";

-- DropTable
DROP TABLE "Favorite";

-- DropTable
DROP TABLE "Listing";

-- DropTable
DROP TABLE "ListingPhoto";

-- DropTable
DROP TABLE "SavedSearch";
