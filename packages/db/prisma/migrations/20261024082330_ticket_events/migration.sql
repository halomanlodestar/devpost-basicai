-- CreateTable
CREATE TABLE "ticket_event" (
    "id" TEXT NOT NULL,
    "emitter_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "trip_id" TEXT,
    "stop_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_event_trip_id_occurred_at_idx" ON "ticket_event"("trip_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_event_emitter_id_idempotency_key_key" ON "ticket_event"("emitter_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "ticket_event" ADD CONSTRAINT "ticket_event_emitter_id_fkey" FOREIGN KEY ("emitter_id") REFERENCES "emitter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_event" ADD CONSTRAINT "ticket_event_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
