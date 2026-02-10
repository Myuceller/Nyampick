"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  BarChart3,
  TrendingUp,
  Baby,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PeerPost {
  id: string;
  authorName: string;
  babyAge: string;
  content: string;
  meals: { type: string; items: string[] }[];
  likes: number;
  comments: number;
  timeAgo: string;
  isLiked: boolean;
}

interface TrendingFood {
  name: string;
  percentage: number;
  category: string;
}

const TRENDING_FOODS: TrendingFood[] = [
  { name: "닭안심 채소죽", percentage: 78, category: "밥/죽" },
  { name: "바나나", percentage: 72, category: "간식" },
  { name: "소고기뭇국", percentage: 65, category: "국/탕" },
  { name: "고구마 스틱", percentage: 60, category: "간식" },
  { name: "당근달걀말이", percentage: 55, category: "반찬" },
  { name: "연어구이", percentage: 48, category: "반찬" },
];

const SAMPLE_POSTS: PeerPost[] = [
  {
    id: "p1",
    authorName: "하율맘",
    babyAge: "12개월",
    content:
      "오늘 처음으로 연어를 먹여봤는데 의외로 잘 먹어요! 소금 없이 구워서 잘게 풀어줬더니 모두 먹었어요.",
    meals: [
      { type: "아침", items: ["흰쌀밥", "된장국"] },
      { type: "점심", items: ["연어구이", "브로콜리 퓨레"] },
      { type: "저녁", items: ["닭안심 채소죽"] },
    ],
    likes: 24,
    comments: 8,
    timeAgo: "2시간 전",
    isLiked: false,
  },
  {
    id: "p2",
    authorName: "서준맘",
    babyAge: "10개월",
    content:
      "소고기야채 주먹밥 만들었는데 대박 잘 먹네요. 소고기는 살짝 볶아서 잘게 다진 후 밥이랑 섞어주면 돼요!",
    meals: [
      { type: "점심", items: ["소고기야채 주먹밥", "미역두부국"] },
      { type: "간식", items: ["요거트", "방울토마토"] },
    ],
    likes: 18,
    comments: 5,
    timeAgo: "5시간 전",
    isLiked: true,
  },
  {
    id: "p3",
    authorName: "은우맘",
    babyAge: "11개월",
    content:
      "이번 주는 철분 보충 식단으로 짰어요. 소고기, 시금치, 달걀을 번갈아가면서 넣어주고 있어요. 비타민D도 꼭 챙겨주세요!",
    meals: [
      { type: "아침", items: ["소고기 당근 진밥"] },
      { type: "점심", items: ["두부시금치 계란찜", "된장국"] },
      { type: "저녁", items: ["대구살 찜", "잡곡밥"] },
    ],
    likes: 31,
    comments: 12,
    timeAgo: "1일 전",
    isLiked: false,
  },
];

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "trending">("feed");
  const [posts, setPosts] = useState(SAMPLE_POSTS);

  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  return (
    <div className="flex-1 pb-24">
      {/* Tabs */}
      <div className="sticky top-[57px] z-30 border-b border-border bg-card">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={cn(
              "flex-1 py-3 text-center text-sm font-medium transition-colors",
              activeTab === "feed"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            )}
          >
            또래 식단
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trending")}
            className={cn(
              "flex-1 py-3 text-center text-sm font-medium transition-colors",
              activeTab === "trending"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            )}
          >
            인기 메뉴
          </button>
        </div>
      </div>

      {activeTab === "feed" ? (
        <div className="flex flex-col gap-3 px-4 pt-4">
          {/* Age filter banner */}
          <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
            <Baby className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs font-semibold text-secondary-foreground">
                10~12개월 또래 식단
              </p>
              <p className="text-[11px] text-muted-foreground">
                비슷한 개월수 아이들의 식단을 확인해보세요
              </p>
            </div>
          </div>

          {/* Posts */}
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              {/* Author */}
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {post.authorName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {post.authorName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {post.babyAge} &middot; {post.timeAgo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <p className="mb-3 text-sm leading-relaxed text-foreground">
                {post.content}
              </p>

              {/* Meals */}
              <div className="mb-3 flex flex-col gap-1.5 rounded-xl bg-muted/50 p-3">
                {post.meals.map((meal) => (
                  <div key={meal.type} className="flex items-start gap-2">
                    <span className="w-8 shrink-0 text-[11px] font-medium text-muted-foreground">
                      {meal.type}
                    </span>
                    <span className="text-xs text-foreground">
                      {meal.items.join(", ")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-colors",
                    post.isLiked
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      post.isLiked && "fill-destructive"
                    )}
                  />
                  {post.likes}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comments}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 pt-4">
          {/* Trending header */}
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">
                10~12개월 인기 메뉴 TOP
              </p>
              <p className="text-[11px] text-muted-foreground">
                같은 또래 아이들이 가장 많이 먹는 메뉴에요
              </p>
            </div>
          </div>

          {/* Nutrition reminder */}
          <div className="mb-4 rounded-2xl border border-border bg-meal-dinner/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-meal-dinner" />
              <p className="text-xs font-semibold text-foreground">
                이번 주 영양 밸런스 팁
              </p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              최근 육류 위주의 식단이 많았어요. 생선(연어, 대구)이나 두부 같은
              식물성 단백질도 함께 섭취하면 더 균형 잡힌 식단이 돼요.
            </p>
          </div>

          {/* Trending list */}
          <div className="flex flex-col gap-2">
            {TRENDING_FOODS.map((food, i) => (
              <div
                key={food.name}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    i < 3
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {food.name}
                    </p>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {food.category}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${food.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-primary">
                  {food.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
