-- CreateEnum
CREATE TYPE "trip_status" AS ENUM ('scheduled', 'active', 'completed');

-- CreateTable
CREATE TABLE "stop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reverse_of_id" TEXT,

    CONSTRAINT "route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stop" (
    "route_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "stop_id" TEXT NOT NULL,
    "offset_min" INTEGER NOT NULL,

    CONSTRAINT "route_stop_pkey" PRIMARY KEY ("route_id","seq")
);

-- CreateTable
CREATE TABLE "segment" (
    "id" TEXT NOT NULL,
    "from_stop_id" TEXT NOT NULL,
    "to_stop_id" TEXT NOT NULL,

    CONSTRAINT "segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus" (
    "id" TEXT NOT NULL,
    "reg_no" TEXT NOT NULL,

    CONSTRAINT "bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emitter" (
    "id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "secret_enc" TEXT NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "emitter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "departure_min" INTEGER NOT NULL,

    CONSTRAINT "journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "service_date" TEXT NOT NULL,
    "status" "trip_status" NOT NULL DEFAULT 'scheduled',
    "last_seq" INTEGER,
    "last_stop_id" TEXT,
    "anchor_at" TIMESTAMPTZ(3),
    "last_seen_at" TIMESTAMPTZ(3),

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_stop_stop_id_route_id_seq_idx" ON "route_stop"("stop_id", "route_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "segment_from_stop_id_to_stop_id_key" ON "segment"("from_stop_id", "to_stop_id");

-- CreateIndex
CREATE UNIQUE INDEX "bus_reg_no_key" ON "bus"("reg_no");

-- CreateIndex
CREATE INDEX "journey_bus_id_departure_min_idx" ON "journey"("bus_id", "departure_min");

-- CreateIndex
CREATE UNIQUE INDEX "trip_journey_id_service_date_key" ON "trip"("journey_id", "service_date");

-- AddForeignKey
ALTER TABLE "route" ADD CONSTRAINT "route_reverse_of_id_fkey" FOREIGN KEY ("reverse_of_id") REFERENCES "route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stop" ADD CONSTRAINT "route_stop_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stop" ADD CONSTRAINT "route_stop_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emitter" ADD CONSTRAINT "emitter_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey" ADD CONSTRAINT "journey_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey" ADD CONSTRAINT "journey_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
