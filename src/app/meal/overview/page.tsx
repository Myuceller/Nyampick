"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import type { DayMeals, MealEntry, MealType } from "@/lib/types";
import { MEAL_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  formatDateKey,
  getWeekDaysMondayStart,
} from "@/features/meal/lib/home-page-utils";

type TabKey = "today" | "week";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function parseDateKey(value: string | null) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function emptyDay(date: Date): DayMeals {
  const dateKey = formatDateKey(date);
  return {
    date: dateKey,
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

function cellLines(entries: MealEntry[]) {
  return entries.map((entry) => entry.menuName + (entry.quantity ? ` ${entry.quantity}` : ""));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function downloadPngFromSvg(svg: string, filename: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("이미지를 만들지 못했습니다."));
    });
    img.src = url;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 저장하지 못했습니다.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildWeeklySvg(weekDays: Date[], mealData: Record<string, DayMeals>) {
  const width = 900;
  const height = 1120;
  const tableX = 50;
  const tableY = 260;
  const dayColWidth = 88;
  const mealColWidth = 190;
  const headerHeight = 78;
  const rowHeight = 112;
  const tableWidth = dayColWidth + mealColWidth * 4;
  const tableHeight = headerHeight + rowHeight * 7;
  const border = "#707070";

  const text = (
    content: string,
    x: number,
    y: number,
    size: number,
    weight = 500,
    anchor = "middle"
  ) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#202725">${escapeXml(content)}</text>`;

  const rowText = (lines: string[], x: number, y: number) =>
    lines
      .slice(0, 4)
      .map((line, index) =>
        text(line, x, y + index * 21, 19, 500, "start")
      )
      .join("");

  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    text("일주일 식단표", width / 2, 155, 44, 800),
    `<rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${tableHeight}" rx="6" fill="#ffffff" stroke="${border}" stroke-width="1.5"/>`,
  ];

  const colXs = [
    tableX,
    tableX + dayColWidth,
    tableX + dayColWidth + mealColWidth,
    tableX + dayColWidth + mealColWidth * 2,
    tableX + dayColWidth + mealColWidth * 3,
    tableX + dayColWidth + mealColWidth * 4,
  ];
  colXs.slice(1, -1).forEach((x) => {
    lines.push(`<line x1="${x}" y1="${tableY}" x2="${x}" y2="${tableY + tableHeight}" stroke="${border}" stroke-width="1"/>`);
  });
  for (let index = 1; index <= 7; index += 1) {
    const y = tableY + headerHeight + rowHeight * index;
    lines.push(`<line x1="${tableX}" y1="${y}" x2="${tableX + tableWidth}" y2="${y}" stroke="${border}" stroke-width="1"/>`);
  }
  lines.push(`<line x1="${tableX}" y1="${tableY + headerHeight}" x2="${tableX + tableWidth}" y2="${tableY + headerHeight}" stroke="${border}" stroke-width="1"/>`);

  MEAL_TYPES.forEach((type, index) => {
    lines.push(text(MEAL_LABELS[type], tableX + dayColWidth + mealColWidth * index + mealColWidth / 2, tableY + 47, 19, 500));
  });

  weekDays.forEach((date, rowIndex) => {
    const dayMeals = mealData[formatDateKey(date)] ?? emptyDay(date);
    const rowTop = tableY + headerHeight + rowHeight * rowIndex;
    lines.push(text(WEEK_LABELS[date.getDay()], tableX + dayColWidth / 2, rowTop + 63, 19, 700));

    MEAL_TYPES.forEach((type, colIndex) => {
      const x = tableX + dayColWidth + mealColWidth * colIndex + 25;
      lines.push(rowText(cellLines(dayMeals[type]), x, rowTop + 42));
    });
  });

  lines.push("</svg>");
  return lines.join("");
}

function MealOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDate = useMemo(() => parseDateKey(searchParams.get("date")), [searchParams]);
  const selectedDateKey = formatDateKey(selectedDate);
  const weekDays = useMemo(() => getWeekDaysMondayStart(selectedDate), [selectedDate]);
  const [activeTab, setActiveTab] = useState<TabKey>("week");
  const [mealData, setMealData] = useState<Record<string, DayMeals>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let baseData: Record<string, DayMeals> = {};
      try {
        const response = await authedFetch("/api/home/summary", { cache: "no-store" });
        const json = (await response.json().catch(() => ({}))) as {
          summary?: { meals?: Record<string, DayMeals> };
        };
        if (response.ok) {
          baseData = json.summary?.meals ?? {};
        }
      } catch {
        baseData = {};
      }

      const editedRaw = localStorage.getItem("nyampick:meal-edit:result");
      if (editedRaw) {
        try {
          const parsed = JSON.parse(editedRaw) as {
            date: string;
            dayMeals: DayMeals;
          };
          if (parsed?.date && parsed?.dayMeals) {
            baseData[parsed.date] = parsed.dayMeals;
          }
        } catch {
          // ignore invalid persisted edit payload
        }
        localStorage.removeItem("nyampick:meal-edit:result");
      }

      setMealData(baseData);
      setLoading(false);
    };

    void load();
  }, []);

  const selectedDayMeals = mealData[selectedDateKey] ?? emptyDay(selectedDate);

  const saveAsImage = async () => {
    try {
      const svg = buildWeeklySvg(weekDays, mealData);
      await downloadPngFromSvg(svg, `weekly-meals-${selectedDateKey}.png`);
      toast.success("이미지를 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지 저장에 실패했습니다.");
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white">
      <div className="relative flex h-[calc(68px+env(safe-area-inset-top))] items-center justify-center px-4 pt-[calc(12px+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-5 flex h-10 w-10 items-center justify-center rounded-full text-[#111816] active:bg-[#eef1ef]"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[18px] font-extrabold leading-[1.45] text-[#202725]">식단 전체보기</h1>
      </div>

      <div className="grid grid-cols-2 border-b border-[#d9dddb]">
        <button
          type="button"
          onClick={() => setActiveTab("today")}
          className={cn(
            "h-[55px] border-b-2 text-[18px] font-extrabold",
            activeTab === "today"
              ? "border-[#57bf8e] text-[#2fbf83]"
              : "border-transparent text-[#202725]"
          )}
        >
          오늘 식단표
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("week")}
          className={cn(
            "h-[55px] border-b-2 text-[18px] font-extrabold",
            activeTab === "week"
              ? "border-[#57bf8e] text-[#2fbf83]"
              : "border-transparent text-[#202725]"
          )}
        >
          일주일 식단표
        </button>
      </div>

      <div className="flex-1 px-5 pb-28 pt-12">
        <h2 className="mb-7 text-center text-[25px] font-extrabold text-[#202725]">
          {activeTab === "week" ? "일주일 식단표" : "오늘 식단표"}
        </h2>

        {loading ? (
          <div className="h-[434px] animate-pulse rounded-[4px] border border-[#9fa5a2] bg-[#f3f5f4]" />
        ) : activeTab === "week" ? (
          <div className="overflow-hidden rounded-[4px] border border-[#8d9490]">
            <table className="w-full table-fixed border-collapse text-[#202725]">
              <colgroup>
                <col className="w-[35px]" />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th className="h-[37px] border-r border-[#b8bfbb] text-[11px] font-normal" />
                  {MEAL_TYPES.map((type) => (
                    <th
                      key={type}
                      className="h-[37px] border-r border-[#b8bfbb] text-[11px] font-normal last:border-r-0"
                    >
                      {MEAL_LABELS[type]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map((date) => {
                  const dayMeals = mealData[formatDateKey(date)] ?? emptyDay(date);
                  return (
                    <tr key={formatDateKey(date)}>
                      <th className="h-[56px] border-r border-t border-[#b8bfbb] text-[12px] font-semibold">
                        {WEEK_LABELS[date.getDay()]}
                      </th>
                      {MEAL_TYPES.map((type) => (
                        <td
                          key={`${formatDateKey(date)}-${type}`}
                          className="h-[56px] whitespace-pre-line border-r border-t border-[#b8bfbb] px-2 py-2 align-top text-[10px] font-medium leading-[1.45] last:border-r-0"
                        >
                          {cellLines(dayMeals[type]).join("\n")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[4px] border border-[#8d9490]">
            <table className="w-full table-fixed border-collapse text-[#202725]">
              <thead>
                <tr>
                  {MEAL_TYPES.map((type) => (
                    <th
                      key={type}
                      className="h-[37px] border-r border-[#b8bfbb] text-[11px] font-normal last:border-r-0"
                    >
                      {MEAL_LABELS[type]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {MEAL_TYPES.map((type) => (
                    <td
                      key={type}
                      className="h-[180px] whitespace-pre-line border-r border-t border-[#b8bfbb] px-3 py-3 align-top text-[12px] font-medium leading-[1.6] last:border-r-0"
                    >
                      {cellLines(selectedDayMeals[type]).join("\n") || "식단 없음"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 bg-white px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => void saveAsImage()}
          className="h-[54px] w-full rounded-[12px] bg-[#5bc38f] text-[18px] font-extrabold text-white"
        >
          이미지로 저장
        </button>
      </div>
    </main>
  );
}

export default function MealOverviewPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-white" />}>
      <MealOverviewContent />
    </Suspense>
  );
}
