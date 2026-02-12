/*
  Warnings:

  - You are about to drop the `route_plan_updates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "route_plan_updates" DROP CONSTRAINT "route_plan_updates_plan_id_fkey";

-- DropTable
DROP TABLE "route_plan_updates";

-- CreateTable
CREATE TABLE "route_events" (
    "id" SERIAL NOT NULL,
    "event_id" VARCHAR(50) NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "segment_id" VARCHAR(50),
    "event_type" VARCHAR(50) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "event_data" JSONB,
    "location" JSONB,
    "replan_recommended" BOOLEAN NOT NULL DEFAULT false,
    "replan_reason" TEXT,
    "impact_summary" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "route_events_event_id_key" ON "route_events"("event_id");

-- CreateIndex
CREATE INDEX "route_events_plan_id_idx" ON "route_events"("plan_id");

-- CreateIndex
CREATE INDEX "route_events_plan_id_segment_id_idx" ON "route_events"("plan_id", "segment_id");

-- CreateIndex
CREATE INDEX "route_events_event_type_idx" ON "route_events"("event_type");

-- AddForeignKey
ALTER TABLE "route_events" ADD CONSTRAINT "route_events_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "route_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
