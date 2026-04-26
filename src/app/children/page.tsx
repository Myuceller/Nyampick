"use client";

import { ArrowLeft, Link2, Plus } from "lucide-react";
import { useChildrenPage } from "@/features/children/hooks/use-children-page";

export default function ChildrenPage() {
  const {
    addChild,
    cancelEditChildName,
    children,
    codeChildId,
    createInviteCode,
    deleteChild,
    deletingChildId,
    editingChildId,
    editingChildName,
    inviteCodeByChildId,
    isJoining,
    isSubmitting,
    isUnlinking,
    isUpdatingName,
    joinByCode,
    joinCode,
    linkedInfo,
    linkedMode,
    loading,
    newMonthsOld,
    newName,
    router,
    saveChildName,
    setEditingChildName,
    setJoinCode,
    setNewMonthsOld,
    setNewName,
    setPrimaryChild,
    startEditChildName,
    unlinkFamily,
    viewerEmail,
    viewerId,
  } = useChildrenPage();

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
                  onClick={cancelEditChildName}
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
