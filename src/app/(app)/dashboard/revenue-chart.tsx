"use client";

import { useEffect, useRef, useState } from "react";
import { axisLabel, niceAxis } from "@/lib/chart-axis";
import { formatCents } from "@/lib/money";
import type { MonthRevenue } from "@/lib/revenue";

const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 56 };
const MAX_BAR = 24;
const RADIUS = 4;

// A bar with a 4px rounded top and a square base on the baseline.
function barPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, height, width / 2);
  const bottom = y + height;
  return `M${x},${bottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${bottom}Z`;
}

export function RevenueChart({ months }: { months: MonthRevenue[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const total = months.reduce((sum, month) => sum + month.cents, 0);
  const { max, ticks } = niceAxis(
    Math.max(...months.map((month) => month.cents)),
  );

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const slot = plotWidth / months.length;
  const barWidth = Math.min(MAX_BAR, slot * 0.6);
  const y = (cents: number) => MARGIN.top + plotHeight * (1 - cents / max);

  const activeMonth = active === null ? undefined : months[active];

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Paid revenue by month for the last 12 months, ${formatCents(total)} in total`}
          className="block"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                strokeWidth={1}
                className="stroke-zinc-200 dark:stroke-zinc-800"
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-zinc-500 text-[11px] tabular-nums dark:fill-zinc-400"
              >
                {axisLabel(tick)}
              </text>
            </g>
          ))}

          {months.map((month, index) => {
            const slotX = MARGIN.left + index * slot;
            const barHeight = plotHeight * (month.cents / max);
            const isActive = active === index;
            return (
              <g
                key={month.month}
                tabIndex={0}
                aria-label={`${month.label}: ${formatCents(month.cents)}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
              >
                {/* The whole column is the hover target, not just the bar. */}
                <rect
                  x={slotX}
                  y={MARGIN.top}
                  width={slot}
                  height={plotHeight}
                  fill="transparent"
                />
                {barHeight > 0 && (
                  <path
                    d={barPath(
                      slotX + (slot - barWidth) / 2,
                      y(month.cents),
                      barWidth,
                      barHeight,
                    )}
                    className={`fill-[#2a78d6] dark:fill-[#3987e5] ${isActive ? "opacity-75" : ""}`}
                  />
                )}
                <text
                  x={slotX + slot / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className={`text-[11px] ${isActive ? "fill-zinc-900 dark:fill-zinc-100" : "fill-zinc-500 dark:fill-zinc-400"}`}
                >
                  {slot < 28 && index % 2 === 1 ? "" : month.label}
                </text>
              </g>
            );
          })}
        </svg>

        {activeMonth && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            style={{
              left: Math.min(
                Math.max(MARGIN.left + (active + 0.5) * slot, 60),
                width - 60,
              ),
            }}
          >
            <p className="font-semibold tabular-nums">
              {formatCents(activeMonth.cents)}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(`${activeMonth.month}-01T00:00:00Z`).toLocaleString(
                "en-US",
                { month: "long", year: "numeric", timeZone: "UTC" },
              )}
            </p>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
          Show as table
        </summary>
        <table className="mt-2 w-full max-w-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
              <th className="py-1 font-medium">Month</th>
              <th className="py-1 text-right font-medium">Paid</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr
                key={month.month}
                className="border-t border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-1">{month.month}</td>
                <td className="py-1 text-right tabular-nums">
                  {formatCents(month.cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
