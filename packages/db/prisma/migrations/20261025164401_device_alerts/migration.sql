-- CreateTable
CREATE TABLE "device" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "service_date" TEXT NOT NULL,
    "from_stop_id" TEXT NOT NULL,
    "to_stop_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sent_thresholds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "last_late_bucket" INTEGER NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_endpoint_key" ON "device"("endpoint");

-- CreateIndex
CREATE INDEX "alert_journey_id_service_date_idx" ON "alert"("journey_id", "service_date");

-- CreateIndex
CREATE UNIQUE INDEX "alert_device_id_journey_id_service_date_key" ON "alert"("device_id", "journey_id", "service_date");

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
