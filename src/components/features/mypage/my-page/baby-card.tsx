interface BabyCardProps {
  loading: boolean;
  saving: boolean;
  linkedMode: boolean;
  babyName: string;
  babyMonthsOld: string;
  onBabyNameChange: (value: string) => void;
  onBabyMonthsOldChange: (value: string) => void;
  onSave: () => void;
}

export function BabyCard({
  loading,
  saving,
  linkedMode,
  babyName,
  babyMonthsOld,
  onBabyNameChange,
  onBabyMonthsOldChange,
  onSave,
}: BabyCardProps) {
  return (
    <div className="rounded-2xl border border-[#cbd5d1] bg-white p-4">
      <h2 className="text-[18px] font-bold text-[#1f2725]">우리 아기</h2>
      {loading ? (
        <p className="mt-3 text-[15px] text-[#6f7875]">불러오는 중...</p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-[13px] font-semibold text-[#6a7471]">아기 이름</label>
          <input
            value={babyName}
            onChange={(e) => onBabyNameChange(e.target.value)}
            disabled={linkedMode}
            className="h-11 w-full rounded-xl border border-[#d4ddda] px-3 text-[15px] outline-none disabled:bg-[#f2f4f3]"
          />
          <label className="block text-[13px] font-semibold text-[#6a7471]">개월 수</label>
          <input
            value={babyMonthsOld}
            onChange={(e) => onBabyMonthsOldChange(e.target.value)}
            disabled={linkedMode}
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-[#d4ddda] px-3 text-[15px] outline-none disabled:bg-[#f2f4f3]"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading || linkedMode}
            className="mt-2 h-11 w-full rounded-xl bg-[#57bf8e] text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "아기 정보 저장"}
          </button>
        </div>
      )}
    </div>
  );
}
