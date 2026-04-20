"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Link2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/authed-fetch";

interface ChildProfile {
  id: string;
  name: string;
  monthsOld: number;
  isPrimary: boolean;
}

interface LinkedInfo {
  ownerUserId: string;
  childId: string;
  linkedAt: string;
  ownerName?: string;
  ownerEmail?: string;
  childName?: string;
}

export default function ChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [codeChildId, setCodeChildId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newMonthsOld, setNewMonthsOld] = useState("0");
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [inviteCodeByChildId, setInviteCodeByChildId] = useState<Record<string, string>>({});
  const [linkedMode, setLinkedMode] = useState(false);
  const [viewerEmail, setViewerEmail] = useState<string>("");
  const [viewerId, setViewerId] = useState<string>("");
  const [linkedInfo, setLinkedInfo] = useState<LinkedInfo | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/children", { cache: "no-store" });
      const json = (await res.json()) as {
        children?: ChildProfile[];
        linkedMode?: boolean;
        viewer?: {
          id: string;
          email: string | null;
        };
        linkedInfo?: LinkedInfo | null;
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "아이 정보를 불러오지 못했습니다.");
      setChildren(json.children ?? []);
      setLinkedMode(Boolean(json.linkedMode));
      setViewerEmail(json.viewer?.email ?? "");
      setViewerId(json.viewer?.id ?? "");
      setLinkedInfo(json.linkedInfo ?? null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "아이 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChildren();
  }, []);

  const addChild = async () => {
    const name = newName.trim();
    const monthsOld = Number.parseInt(newMonthsOld, 10);
    if (!name) return;
    if (!Number.isInteger(monthsOld) || monthsOld < 0) {
      alert("개월 수는 0 이상의 정수여야 합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authedFetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, monthsOld }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "아이 추가에 실패했습니다.");
      setNewName("");
      setNewMonthsOld("0");
      await loadChildren();
    } catch (error) {
      alert(error instanceof Error ? error.message : "아이 추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPrimaryChild = async (childId: string) => {
    try {
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: childId, isPrimary: true }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "대표 아이 설정에 실패했습니다.");
      await loadChildren();
    } catch (error) {
      alert(error instanceof Error ? error.message : "대표 아이 설정에 실패했습니다.");
    }
  };

  const deleteChild = async (childId: string, childName: string) => {
    if (!confirm(`"${childName}" 아기 정보를 삭제할까요?`)) return;
    setDeletingChildId(childId);
    try {
      const res = await authedFetch("/api/children", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: childId }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "아기 삭제에 실패했습니다.");
      await loadChildren();
    } catch (error) {
      alert(error instanceof Error ? error.message : "아기 삭제에 실패했습니다.");
    } finally {
      setDeletingChildId(null);
    }
  };

  const startEditChildName = (child: ChildProfile) => {
    setEditingChildId(child.id);
    setEditingChildName(child.name);
  };

  const saveChildName = async () => {
    if (!editingChildId) return;
    const name = editingChildName.trim();
    if (!name) {
      alert("이름을 입력해주세요.");
      return;
    }
    setIsUpdatingName(true);
    try {
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingChildId, name }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "이름 변경에 실패했습니다.");
      setEditingChildId(null);
      setEditingChildName("");
      await loadChildren();
    } catch (error) {
      alert(error instanceof Error ? error.message : "이름 변경에 실패했습니다.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const createInviteCode = async (childId: string) => {
    if (codeChildId) return;
    setCodeChildId(childId);
    try {
      const res = await authedFetch("/api/children/invite-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      const json = (await res.json()) as {
        code?: string;
        message?: string;
      };
      if (!res.ok || !json.code) {
        throw new Error(json.message ?? "초대코드 생성에 실패했습니다.");
      }
      setInviteCodeByChildId((prev) => ({ ...prev, [childId]: json.code! }));
      await navigator.clipboard.writeText(json.code);
      alert("초대코드를 복사했습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "초대코드 생성에 실패했습니다.");
    } finally {
      setCodeChildId(null);
    }
  };

  const joinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    try {
      const res = await authedFetch("/api/children/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "초대코드 연결에 실패했습니다.");
      setJoinCode("");
      alert("가족 데이터에 연결되었습니다.");
      await loadChildren();
    } catch (error) {
      alert(error instanceof Error ? error.message : "초대코드 연결에 실패했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  const unlinkFamily = async () => {
    if (!confirm("가족 연결을 끊을까요?")) return;
    setIsUnlinking(true);
    try {
      const res = await authedFetch("/api/children/unlink", {
        method: "POST",
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "가족 연결 해제에 실패했습니다.");
      alert("가족 연결이 해제되었습니다.");
      await loadChildren();
    } catch (error) {
      alert(error instanceof Error ? error.message : "가족 연결 해제에 실패했습니다.");
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[rgb(243,248,244)] px-4 pb-16 pt-10">
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md p-1 text-[#1f2725]"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[24px] font-bold text-[#1f2725]">아기 관리</h1>
      </div>

      <section className="rounded-[18px] border border-[#dbe7e1] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#1f2725]">연결 상태</h2>
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              linkedMode
                ? "bg-[#e9f6ef] text-[#2d9568]"
                : "bg-[#edf1ef] text-[#68726f]"
            }`}
          >
            {linkedMode ? "가족 연결됨" : "단독 사용"}
          </span>
        </div>
        <div className="mt-3 space-y-1 text-[13px] text-[#67716e]">
          <p>내 계정: {viewerEmail || viewerId || "-"}</p>
          {linkedMode ? (
            <>
              <p>
                연결된 보호자:{" "}
                {linkedInfo?.ownerName || linkedInfo?.ownerEmail || linkedInfo?.ownerUserId || "-"}
              </p>
              <p>공유 중인 아이: {linkedInfo?.childName || "-"}</p>
            </>
          ) : (
            <p>아직 가족 연결이 없습니다.</p>
          )}
        </div>
        {linkedMode ? (
          <button
            type="button"
            onClick={() => void unlinkFamily()}
            disabled={isUnlinking}
            className="mt-3 h-10 rounded-xl border border-[#e3b7b7] px-4 text-[13px] font-semibold text-[#b14d4d] disabled:opacity-60"
          >
            {isUnlinking ? "해제 중..." : "가족 연결 끊기"}
          </button>
        ) : null}
      </section>

      {linkedMode ? (
        <section className="mt-3 rounded-[18px] bg-white p-4 shadow-sm">
          <h2 className="text-[17px] font-bold text-[#1f2725]">가족 데이터 연결됨</h2>
          <p className="mt-2 text-[14px] text-[#6f7875]">
            현재 계정은 초대코드로 연결되어 있어 가족 데이터만 표시됩니다.
          </p>
        </section>
      ) : (
        <section className="rounded-[18px] bg-white p-4 shadow-sm">
          <h2 className="text-[17px] font-bold text-[#1f2725]">아이 추가</h2>
          <div className="mt-3 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="아이 이름"
              className="h-11 w-full rounded-xl border border-[#cfd7d3] px-3 text-[15px] outline-none"
            />
            <input
              value={newMonthsOld}
              onChange={(e) => setNewMonthsOld(e.target.value)}
              inputMode="numeric"
              placeholder="개월 수"
              className="h-11 w-full rounded-xl border border-[#cfd7d3] px-3 text-[15px] outline-none"
            />
            <button
              type="button"
              onClick={() => void addChild()}
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#57bf8e] text-[15px] font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              아이 추가
            </button>
          </div>
        </section>
      )}

      <section className="mt-3 rounded-[18px] bg-white p-4 shadow-sm">
        <h2 className="text-[17px] font-bold text-[#1f2725]">가족 초대코드 입력</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="초대코드 입력"
            className="h-11 flex-1 rounded-xl border border-[#cfd7d3] px-3 text-[15px] uppercase outline-none"
          />
          <button
            type="button"
            onClick={() => void joinByCode()}
            disabled={isJoining}
            className="h-11 rounded-xl bg-[#57bf8e] px-4 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {isJoining ? "연결중..." : "연결"}
          </button>
        </div>
      </section>

      <section className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-[18px] bg-white p-4 text-[14px] text-[#6f7875]">불러오는 중...</div>
        ) : null}
        {!loading && children.length === 0 ? (
          <div className="rounded-[18px] bg-white p-4 text-[14px] text-[#6f7875]">등록된 아이가 없습니다.</div>
        ) : null}
        {children.map((child) => (
          <article key={child.id} className="rounded-[18px] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[18px] font-bold text-[#1f2725]">{child.name}</p>
                <p className="text-[14px] text-[#707a77]">생후 {child.monthsOld}개월</p>
              </div>
              <div className="flex items-center gap-2">
                {child.isPrimary ? (
                  <span className="rounded-full bg-[#e8f6ef] px-3 py-1 text-[12px] font-semibold text-[#349f70]">
                    대표 아이
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setPrimaryChild(child.id)}
                    disabled={linkedMode}
                    className="rounded-full border border-[#b7c6bf] px-3 py-1 text-[12px] font-semibold text-[#5f6a67]"
                  >
                    대표로 설정
                  </button>
                )}
                {!linkedMode ? (
                  <button
                    type="button"
                    onClick={() => startEditChildName(child)}
                    className="rounded-full border border-[#cad8d2] px-3 py-1 text-[12px] font-semibold text-[#55635f]"
                  >
                    이름 변경
                  </button>
                ) : null}
                {!linkedMode ? (
                  <button
                    type="button"
                    onClick={() => void deleteChild(child.id, child.name)}
                    disabled={deletingChildId === child.id}
                    className="rounded-full border border-[#e1bbbb] px-3 py-1 text-[12px] font-semibold text-[#b25555] disabled:opacity-60"
                  >
                    {deletingChildId === child.id ? "삭제 중..." : "삭제"}
                  </button>
                ) : null}
              </div>
            </div>

            {editingChildId === child.id ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={editingChildName}
                  onChange={(e) => setEditingChildName(e.target.value)}
                  placeholder="새 이름"
                  className="h-10 flex-1 rounded-xl border border-[#cfd7d3] px-3 text-[14px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => void saveChildName()}
                  disabled={isUpdatingName}
                  className="h-10 rounded-xl bg-[#57bf8e] px-3 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingChildId(null);
                    setEditingChildName("");
                  }}
                  className="h-10 rounded-xl border border-[#cad8d2] px-3 text-[13px] font-semibold text-[#5c6663]"
                >
                  취소
                </button>
              </div>
            ) : null}

            {!linkedMode ? (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => void createInviteCode(child.id)}
                  disabled={codeChildId === child.id}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl bg-[#57bf8e] text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  <Link2 className="h-4 w-4" />
                  {codeChildId === child.id ? "생성 중..." : "초대코드 생성"}
                </button>
              </div>
            ) : null}

            {inviteCodeByChildId[child.id] ? (
              <p className="mt-2 break-all text-[12px] text-[#5f6b66]">
                초대코드: {inviteCodeByChildId[child.id]}
              </p>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
