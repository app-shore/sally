"use client";

import type { HOSState } from "@/features/routing/route-planning";

interface HOSProgressBarsProps {
  hosState: HOSState;
  segmentType: string;
  isReset?: boolean;
  showCycle?: boolean;
}

/** Compact one-liner for low-usage HOS state */
interface HOSSummaryProps {
  hosState: HOSState;
}

const DRIVE_LIMIT = 11;
const DUTY_LIMIT = 14;
const BREAK_LIMIT = 8;
const CYCLE_LIMIT = 70;

/** Returns true if any HOS clock is above 50% — worth showing bars */
export function isHOSMeaningful(hosState: HOSState): boolean {
  return (
    hosState.hoursDriven / DRIVE_LIMIT >= 0.5 ||
    hosState.onDutyTime / DUTY_LIMIT >= 0.5 ||
    hosState.hoursSinceBreak / BREAK_LIMIT >= 0.5
  );
}

function formatHOS(used: number, limit: number): string {
  return `${used.toFixed(1)}/${limit}h`;
}

function getBarColor(ratio: number): string {
  if (ratio >= 0.9) return "bg-red-500 dark:bg-red-400";
  if (ratio >= 0.75) return "bg-yellow-500 dark:bg-yellow-400";
  if (ratio >= 0.5) return "bg-gray-600 dark:bg-gray-400";
  return "bg-foreground";
}

function getWarningTextColor(ratio: number): string {
  if (ratio >= 0.9) return "text-red-600 dark:text-red-400";
  return "text-yellow-600 dark:text-yellow-400";
}

function HOSBar({
  label,
  used,
  limit,
  isReset,
  warning,
}: {
  label: string;
  used: number;
  limit: number;
  isReset?: boolean;
  warning?: string;
}) {
  const ratio = Math.min(used / limit, 1);
  const percentage = ratio * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-muted-foreground w-10 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 relative">
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isReset ? "bg-green-500 dark:bg-green-400" : getBarColor(ratio)
            }`}
            style={{ width: `${isReset ? 0 : percentage}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-16 text-right flex-shrink-0">
        {isReset ? (
          <span className="text-green-600 dark:text-green-400">RESET</span>
        ) : (
          formatHOS(used, limit)
        )}
      </span>
      {warning && (
        <span className={`text-[10px] flex-shrink-0 ${getWarningTextColor(ratio)}`}>
          {warning}
        </span>
      )}
    </div>
  );
}

/** Compact one-liner shown when HOS clocks are all below 50% */
export function HOSSummary({ hosState }: HOSSummaryProps) {
  const driveRemaining = DRIVE_LIMIT - hosState.hoursDriven;
  const dutyRemaining = DUTY_LIMIT - hosState.onDutyTime;
  const available = Math.min(driveRemaining, dutyRemaining);

  return (
    <div className="mt-1.5 text-[10px] text-muted-foreground">
      HOS: {available.toFixed(1)}h drive available
    </div>
  );
}

export function HOSProgressBars({
  hosState,
  segmentType,
  isReset,
  showCycle,
}: HOSProgressBarsProps) {
  const driveRatio = hosState.hoursDriven / DRIVE_LIMIT;
  const dutyRatio = hosState.onDutyTime / DUTY_LIMIT;
  const breakRatio = hosState.hoursSinceBreak / BREAK_LIMIT;

  const driveWarning =
    driveRatio >= 0.9 && !isReset ? "limit!" : driveRatio >= 0.75 && !isReset ? "!" : undefined;
  const dutyWarning =
    dutyRatio >= 0.9 && !isReset ? "limit!" : dutyRatio >= 0.75 && !isReset ? "!" : undefined;
  const breakWarning =
    breakRatio >= 0.9 && !isReset ? "break now!" : breakRatio >= 0.75 && !isReset
      ? "break soon"
      : undefined;

  return (
    <div className="space-y-1 mt-2 p-2 rounded-md bg-muted/30">
      <HOSBar
        label="Drive"
        used={hosState.hoursDriven}
        limit={DRIVE_LIMIT}
        isReset={isReset && segmentType === "rest"}
        warning={driveWarning}
      />
      <HOSBar
        label="Duty"
        used={hosState.onDutyTime}
        limit={DUTY_LIMIT}
        isReset={isReset && segmentType === "rest"}
        warning={dutyWarning}
      />
      <HOSBar
        label="Break"
        used={hosState.hoursSinceBreak}
        limit={BREAK_LIMIT}
        isReset={isReset && (segmentType === "rest" || segmentType === "break")}
        warning={breakWarning}
      />
      {showCycle && (
        <HOSBar
          label="Cycle"
          used={hosState.cycleHoursUsed}
          limit={CYCLE_LIMIT}
          isReset={false}
        />
      )}
    </div>
  );
}
