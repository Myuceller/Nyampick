"use client";

import { useState } from "react";
import {
  Baby,
  UserPlus,
  ChevronRight,
  Settings,
  Share2,
  BookOpen,
  BarChart3,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  isConnected: boolean;
}

const SAMPLE_FAMILY: FamilyMember[] = [
  { id: "f1", name: "아빠", relation: "배우자", isConnected: true },
];

export function MyPage() {
  const [family] = useState(SAMPLE_FAMILY);

  const menuSections = [
    {
      title: "아이 정보",
      items: [
        {
          icon: Baby,
          label: "아이 프로필",
          desc: "하율 (11개월)",
          href: "#",
        },
        {
          icon: BarChart3,
          label: "영양 리포트",
          desc: "탄단지 밸런스 확인",
          href: "#",
        },
        {
          icon: Utensils,
          label: "메뉴판 관리",
          desc: "25개 메뉴 등록됨",
          href: "#",
        },
      ],
    },
    {
      title: "가족",
      items: [
        {
          icon: Share2,
          label: "가족 공유",
          desc: `${family.length}명 연동됨`,
          href: "#",
        },
        {
          icon: UserPlus,
          label: "가족 추가",
          desc: "초대 링크 보내기",
          href: "#",
        },
      ],
    },
    {
      title: "더보기",
      items: [
        {
          icon: BookOpen,
          label: "유아식 가이드",
          desc: "월령별 식단 가이드",
          href: "#",
        },
        {
          icon: Settings,
          label: "설정",
          desc: "알림, 계정 관리",
          href: "#",
        },
      ],
    },
  ];

  return (
    <div className="flex-1 pb-24">
      {/* Profile header */}
      <div className="bg-card px-4 pb-5 pt-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Baby className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">하율맘</h2>
            <p className="text-xs text-muted-foreground">
              하율 (11개월) &middot; 이유식 후기
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "기록일", value: "45일" },
            { label: "등록 메뉴", value: "25개" },
            { label: "가족 연동", value: `${family.length + 1}명` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-2xl bg-muted py-3"
            >
              <span className="text-base font-bold text-foreground">
                {stat.value}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition balance card */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            이번 주 탄단지 밸런스
          </h3>
          <span className="text-[11px] text-muted-foreground">2월 1주차</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { label: "탄수화물", value: 45, color: "bg-meal-breakfast" },
            { label: "단백질", value: 30, color: "bg-meal-lunch" },
            { label: "지방", value: 25, color: "bg-meal-dinner" },
          ].map((nutrient) => (
            <div key={nutrient.label} className="flex items-center gap-3">
              <span className="w-16 text-xs text-muted-foreground">
                {nutrient.label}
              </span>
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      nutrient.color
                    )}
                    style={{ width: `${nutrient.value}%` }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-xs font-semibold text-foreground">
                {nutrient.value}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          단백질 섭취가 조금 부족해요. 두부, 계란을 더 넣어보는 건 어떨까요?
        </p>
      </div>

      {/* Menu sections */}
      <div className="mt-4 flex flex-col gap-4 px-4">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
              {section.title}
            </h3>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted",
                    i < section.items.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                    <item.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Connected family */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-foreground">연동된 가족</h3>
        <div className="flex flex-col gap-2">
          {family.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {member.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {member.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {member.relation}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                연동됨
              </span>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <UserPlus className="h-4 w-4" />
            가족 초대하기
          </button>
        </div>
      </div>
    </div>
  );
}
