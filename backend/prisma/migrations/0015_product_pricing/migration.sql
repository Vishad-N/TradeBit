-- CreateTable
CREATE TABLE "ProductPricing" (
    "product" TEXT NOT NULL,
    "listPrice" DECIMAL(12,2) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "offerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "offerPrice" DECIMAL(12,2),
    "offerTitle" TEXT,
    "offerStartsAt" TIMESTAMP(3),
    "offerEndsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricing_pkey" PRIMARY KEY ("product")
);
