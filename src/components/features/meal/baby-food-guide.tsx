"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Beef,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  Cookie,
  Cuboid,
  Droplet,
  Fish,
  Heart,
  HelpCircle,
  Leaf,
  Soup,
  Sparkles,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GuideTabId = "start" | "allergy" | "amount" | "avoid" | "tips";

const guideTabs: Array<{ id: GuideTabId; label: string }> = [
  { id: "start", label: "시작 시기" },
  { id: "allergy", label: "알레르기" },
  { id: "amount", label: "양 & 횟수" },
  { id: "avoid", label: "주의 식품" },
  { id: "tips", label: "진행 팁" },
];

function GuideIcon({
  children,
  variant = "green",
}: {
  children: React.ReactNode;
  variant?: "green" | "purple";
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]",
        variant === "purple" ? "bg-[#ede9fe] text-[#7c3aed]" : "bg-[#e8f5ef] text-[#57bf8e]"
      )}
    >
      {children}
    </span>
  );
}

function TipCard({
  icon,
  title,
  children,
  iconVariant,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  iconVariant?: "green" | "purple";
}) {
  return (
    <article className="rounded-[16px] border border-[#d4ede0] bg-white p-[18px] shadow-[0_2px_10px_rgba(87,191,142,0.07)]">
      <div className="mb-3 flex items-start gap-3">
        <GuideIcon variant={iconVariant}>{icon}</GuideIcon>
        <h3 className="pt-0.5 text-[15px] font-semibold leading-[1.45] text-[#1a3a28]">
          {title}
        </h3>
      </div>
      <div className="space-y-2 text-[13px] font-medium leading-[1.7] text-[#4a7a60]">
        {children}
      </div>
    </article>
  );
}

function WarningCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[16px] border border-[#f5d98a] bg-[#fff8e8] p-[18px]">
      <div className="mb-3 flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d97706]" />
        <h3 className="text-[15px] font-semibold leading-[1.45] text-[#92400e]">{title}</h3>
      </div>
      <div className="space-y-2 text-[13px] font-medium leading-[1.7] text-[#92400e]/85">
        {children}
      </div>
    </article>
  );
}

function CheckCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label?: string; text: React.ReactNode; strongLabel?: boolean }>;
}) {
  return (
    <article className="rounded-[16px] border border-[#d4ede0] bg-white p-[18px] shadow-[0_2px_10px_rgba(87,191,142,0.07)]">
      <h3 className="mb-3.5 text-[15px] font-semibold leading-[1.45] text-[#1a3a28]">
        {title}
      </h3>
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                item.label
                  ? "border border-[#b8dfc8] bg-white text-[#3fa876]"
                  : "bg-[#e8f5ef] text-[#57bf8e]"
              )}
            >
              {item.label ?? <Check className="h-3 w-3" />}
            </span>
            <p className="text-[13px] font-medium leading-[1.7] text-[#4a7a60]">{item.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function Disclaimer() {
  return (
    <div className="rounded-[12px] border border-[#e5e8ec] bg-[#f7f8f9] px-4 py-3.5">
      <p className="text-[12px] font-medium leading-[1.7] text-[#6b7280]">
        이 내용은 일반적인 이유식 정보를 바탕으로 정리한 참고용 가이드예요. 아이마다 성장
        속도와 건강 상태가 다를 수 있으니, 걱정되는 점이 있다면 소아청소년과 전문의와
        상담해 주세요.
      </p>
    </div>
  );
}

function TimelineCard() {
  const rows = [
    {
      step: "초기",
      month: "생후 4~6개월",
      content: "쌀미음부터 시작해요. 이후 소고기, 채소, 과일 순으로 도입해요.",
    },
    {
      step: "중기",
      month: "생후 7~9개월",
      content: "하루 2회로 늘려요. 입자를 조금씩 크게 하고, 농도는 5~8배죽으로 조절해요.",
    },
    {
      step: "후기",
      month: "생후 9~11개월",
      content: "하루 3회, 3배죽으로 진행해요. 입자는 약 5mm 정도로 키워요.",
    },
    {
      step: "완료",
      month: "돌 이후",
      content: "가족과 함께 하루 세 끼 밥을 잘 먹는 것이 최종 목표예요.",
      muted: true,
    },
  ];

  return (
    <article className="rounded-[16px] border border-[#d4ede0] bg-white p-[18px] shadow-[0_2px_10px_rgba(87,191,142,0.07)]">
      <h3 className="mb-4 text-[15px] font-semibold leading-[1.45] text-[#1a3a28]">
        단계별 진행 흐름
      </h3>
      <div>
        {rows.map((row, index) => (
          <div key={row.step} className="flex gap-3">
            <div className="flex w-8 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                  row.muted ? "bg-[#e8f5ef] text-[#3fa876]" : "bg-[#57bf8e] text-white"
                )}
              >
                {row.step}
              </span>
              {index < rows.length - 1 ? (
                <span className="my-1 h-full min-h-8 w-0.5 bg-[#d4ede0]" />
              ) : null}
            </div>
            <div className="pb-4">
              <p className="text-[12px] font-semibold leading-[1.55] text-[#57bf8e]">
                {row.month}
              </p>
              <p className="mt-1 text-[13px] font-medium leading-[1.7] text-[#4a7a60]">
                {row.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function BaejukTable() {
  const rows = [
    ["20배죽", "쌀가루 1 : 물 20", "아주 묽음"],
    ["10배죽", "불린쌀 1 : 물 10", "초기 미음"],
    ["5배죽", "불린쌀 1 : 물 5", "중기 이유식"],
    ["3배죽", "불린쌀 1 : 물 3", "후기 이유식"],
    ["2배죽", "쌀/밥 1 : 물 2", "무른밥"],
  ];

  return (
    <div className="mt-3 overflow-hidden rounded-[10px] border border-[#d4ede0]">
      <div className="grid grid-cols-[72px_1fr_72px] bg-[#e8f5ef] px-3 py-2 text-[11px] font-semibold leading-[1.55] text-[#3fa876]">
        <span>표현</span>
        <span>비율</span>
        <span className="text-right">느낌</span>
      </div>
      {rows.map(([name, ratio, feel]) => (
        <div
          key={name}
          className="grid grid-cols-[72px_1fr_72px] border-t border-[#e8f5ef] px-3 py-2.5"
        >
          <span className="text-[13px] font-semibold leading-[1.55] text-[#1a3a28]">{name}</span>
          <span className="text-[12px] font-medium leading-[1.55] text-[#4a7a60]">{ratio}</span>
          <span className="text-right text-[12px] font-medium leading-[1.55] text-[#6b7280]">
            {feel}
          </span>
        </div>
      ))}
    </div>
  );
}

function StartPanel() {
  return (
    <>
      <TipCard icon={<CalendarCheck className="h-5 w-5" />} title="이유식은 보통 생후 6개월 전후에 시작해요">
        <p>생후 6개월 무렵부터는 철분 보충이 중요해져요.</p>
        <p>아이가 앉는 힘이 생기고 음식에 관심을 보인다면 시작을 고려할 수 있어요.</p>
        <span className="inline-flex rounded-[6px] bg-[#e8f5ef] px-2 py-1 text-[11px] font-semibold text-[#3fa876]">
          공공 건강정보와 육아 가이드를 참고했어요
        </span>
      </TipCard>
      <TimelineCard />
      <TipCard icon={<Beef className="h-5 w-5" />} title="생후 6개월 무렵부터 철분 보충을 챙겨요">
        <p>생후 6개월 무렵에는 철분 섭취가 중요해져요.</p>
        <p>고기를 사용할 때는 국물보다 고기 자체를 곱게 갈아 제공하는 방식이 권장돼요.</p>
      </TipCard>
      <Disclaimer />
    </>
  );
}

function AllergyPanel() {
  return (
    <>
      <WarningCard title="새 재료는 천천히 확인해요">
        <p>새 재료는 한 번에 하나씩, 며칠간 반응을 살펴보는 방식이 좋아요.</p>
        <p>발진, 구토, 설사 등 평소와 다른 반응이 있는지 확인해요.</p>
      </WarningCard>
      <CheckCard
        title="테스트 전 확인 사항"
        items={[
          { text: <><strong className="text-[#1a3a28]">오전 시간</strong>에 시작해요. 반응이 있어도 병원에 갈 수 있어요.</> },
          { text: <><strong className="text-[#1a3a28]">주말은 피하는 게 좋아요.</strong> 소아과가 문을 닫아 대처가 어려울 수 있어요.</> },
          { text: <>달걀, 밀가루, 땅콩은 <strong className="text-[#1a3a28]">반응을 특히 주의해서 살펴봐요.</strong></> },
          { text: "발진, 구토, 설사가 나타나면 중단하고 소아과에서 확인받아요." },
        ]}
      />
      <TipCard icon={<Leaf className="h-5 w-5" />} title="일부 채소는 생후 6개월 이후를 권장해요">
        <p>시금치, 당근, 배추, 케일, 비트처럼 질산염이 많은 채소는 생후 6개월 이후에 사용하는 경우가 많아요.</p>
        <p>아이 상태에 따라 다를 수 있으니, 걱정된다면 소아과에 확인해 주세요.</p>
      </TipCard>
      <Disclaimer />
    </>
  );
}

function AmountPanel() {
  return (
    <>
      <CheckCard
        title="초기 이유식 양 가이드"
        items={[
          { label: "적", text: "10~20ml. 처음엔 잘 안 먹는 경우가 많아요. 한 숟가락만 먹어도 충분해요." },
          { label: "평", text: <><strong className="text-[#1a3a28]">약 30ml.</strong> 초기 이유식의 평균 섭취량이에요.</> },
          { label: "잘", text: "60~80ml 이상 잘 먹는다면 횟수 조절을 고려해볼 수 있어요." },
        ]}
      />
      <TipCard icon={<HelpCircle className="h-5 w-5" />} title="배죽이란?">
        <p>배죽은 이유식의 농도를 나타내는 말이에요.</p>
        <p>예를 들어 10배죽은 쌀 1에 물 10을 넣어 만든 묽은 죽을 뜻해요.</p>
        <p>아기가 자라면서 이유식은 묽은 죽에서 되직한 죽, 무른밥 형태로 바뀌어요.</p>
        <BaejukTable />
      </TipCard>
      <TipCard icon={<Droplet className="h-5 w-5" />} title="물은 하루 60ml 정도로만 소량씩 시작해요">
        <p>
          <span className="mr-1 rounded-[6px] bg-[#57bf8e] px-2 py-0.5 text-[12px] font-semibold text-white">
            이유식 시작 후부터
          </span>
          생후 6개월부터 조금씩 마실 수 있어요.
        </p>
        <p>이 시기에는 모유나 분유 섭취가 중요하므로, 물을 너무 많이 주지 않도록 해요.</p>
        <p>하루 60ml 정도면 충분하고, 200ml처럼 많은 양은 권장하지 않아요.</p>
      </TipCard>
      <Disclaimer />
    </>
  );
}

function AvoidPanel() {
  return (
    <>
      <WarningCard title="돌 전에는 피해야 하는 식품이 있어요">
        <p><strong>꿀</strong>은 돌 전 아기에게 주지 않는 것이 안전해요.</p>
        <p><strong>생우유</strong>는 돌 이후부터 권장돼요.</p>
      </WarningCard>
      <TipCard icon={<Fish className="h-5 w-5" />} title="생선은 횟수와 종류를 신경 써요">
        <p>흰살 생선처럼 기름기가 적은 생선을 중심으로 시작해요.</p>
        <p>수은 등 중금속 우려가 있어 주 2회를 넘기지 않도록 주의해요.</p>
      </TipCard>
      <TipCard icon={<Soup className="h-5 w-5" />} title="치즈는 나트륨을 확인하고 소량씩">
        <p>생후 6개월 이후 사용할 수 있지만, 나트륨 함량이 적은 아기용 치즈를 선택해요.</p>
        <p>분유를 잘 먹는다면 굳이 이른 시기에 줄 필요는 없어요.</p>
      </TipCard>
      <TipCard icon={<Cookie className="h-5 w-5" />} title="쌀과자는 쌀 100%, 무설탕으로 골라요">
        <p>돌 전까지는 설탕이 없는 제품이 좋아요.</p>
        <p>입에 붙을 수 있으니 물을 꼭 함께 챙기고, 먹일 때는 반드시 옆에서 지켜봐요.</p>
      </TipCard>
      <Disclaimer />
    </>
  );
}

function TipsPanel() {
  return (
    <>
      <TipCard icon={<Heart className="h-5 w-5" />} title="식단표 60%만 해도 잘한 거예요">
        <p>여행, 아픈 날, 바쁜 날에 며칠 못 챙겼다고 잘못된 게 아니에요.</p>
        <p>새로운 재료만 꼼꼼히 확인하고, 나머지는 유연하게 조절하면 돼요.</p>
      </TipCard>
      <TipCard icon={<Cuboid className="h-5 w-5" />} title="큐브는 만든 날로부터 2~3주 내 사용해요">
        <p>냉동 큐브는 2주 내 사용이 가장 좋고, 3주 정도도 괜찮아요.</p>
        <p>만든 날짜를 표시해두고, 오래된 것부터 먼저 사용해요.</p>
      </TipCard>
      <TipCard icon={<Sun className="h-5 w-5" />} title="오전엔 새 재료, 오후엔 익숙한 재료">
        <p>중기부터 하루 2회 줄 때, 오전에 새 재료 1가지를 시도해요.</p>
        <p>오후에는 이미 먹였던 안전한 재료로 구성하면 반응 추적이 쉬워져요.</p>
      </TipCard>
      <TipCard icon={<Sparkles className="h-5 w-5" />} title="토핑이유식, 꼭 해야 할까요?" iconVariant="purple">
        <p>죽이유식, 토핑이유식, 시판이유식 중 어떤 방식이든 괜찮아요.</p>
        <p>재료별 반응을 보기 편한 것이 토핑이유식의 장점일 뿐, 정해진 정답은 없어요.</p>
      </TipCard>
      <Disclaimer />
    </>
  );
}

function GuidePanel({ activeTab }: { activeTab: GuideTabId }) {
  if (activeTab === "start") return <StartPanel />;
  if (activeTab === "allergy") return <AllergyPanel />;
  if (activeTab === "amount") return <AmountPanel />;
  if (activeTab === "avoid") return <AvoidPanel />;
  return <TipsPanel />;
}

export function BabyFoodGuideBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="mt-4 rounded-[22px] bg-[#fdfefd] px-4 py-4 shadow-[0_2px_10px_rgba(87,191,142,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#e8f5ef] text-[#57bf8e]">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-[1.45] text-[#1a3a28]">
              이유식 준비가 처음이라면
            </p>
            <p className="mt-0.5 text-[12px] font-medium leading-[1.55] text-[#6f7875]">
              시작 시기와 주의사항을 빠르게 확인해요.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-[12px] bg-[#57bf8e] px-3.5 text-[13px] font-semibold leading-none text-white transition active:bg-[#3fa876]"
          aria-label="이유식 준비 도움말 보기"
        >
          도움말 보기
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export function BabyFoodGuideSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<GuideTabId>("start");
  const activeLabel = useMemo(
    () => guideTabs.find((tab) => tab.id === activeTab)?.label ?? "시작 시기",
    [activeTab]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#f0faf5]">
      <section className="flex h-[100dvh] w-full max-w-[480px] flex-col bg-[#f0faf5]">
        <header className="sticky top-0 z-10 flex h-[calc(56px+env(safe-area-inset-top))] items-center justify-center border-b border-[#b8dfc8] bg-[#f0faf5]/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 flex h-11 min-w-11 items-center gap-1 rounded-full text-[15px] font-semibold text-[#57bf8e] active:bg-[#e8f5ef]"
            aria-label="이유식 가이드 닫기"
          >
            <ArrowLeft className="h-5 w-5" />
            홈
          </button>
          <h2 className="text-[17px] font-semibold leading-[1.45] text-[#1a3a28]">
            이유식 가이드
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(44px+env(safe-area-inset-bottom))] pt-5">
          <div className="mb-1">
            <h3 className="text-[20px] font-bold leading-[1.32] text-[#1a3a28]">
              이유식 가이드
            </h3>
            <p className="mt-1 text-[13px] font-medium leading-[1.55] text-[#3fa876]">
              이유식 시작 전 알아두면 좋은 내용을 모았어요
            </p>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pt-3" role="tablist">
            {guideTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={cn(
                  "h-[34px] shrink-0 rounded-full border px-3.5 text-[13px] font-semibold leading-none transition",
                  activeTab === tab.id
                    ? "border-[#57bf8e] bg-[#57bf8e] text-white"
                    : "border-[#b8dfc8] bg-white text-[#3fa876]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4" aria-label={`${activeLabel} 가이드`}>
            <GuidePanel activeTab={activeTab} />
          </div>
        </div>
      </section>
    </div>
  );
}
