interface ProfileCardProps {
  loading: boolean;
  saving: boolean;
  userEmail: string;
  userId: string;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  onSave: () => void;
}

export function ProfileCard({
  loading,
  saving,
  userEmail,
  userId,
  profileName,
  onProfileNameChange,
  onSave,
}: ProfileCardProps) {
  return (
    <div className="rounded-2xl border border-[#cbd5d1] bg-white p-4">
      <h2 className="text-[18px] font-bold text-[#1f2725]">내 정보</h2>
      {loading ? (
        <p className="mt-3 text-[15px] text-[#6f7875]">불러오는 중...</p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-[13px] font-semibold text-[#6a7471]">보호자 이름</label>
          <input
            value={profileName}
            onChange={(e) => onProfileNameChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#d4ddda] px-3 text-[15px] outline-none"
          />
          <p className="text-[13px] text-[#6f7875]">로그인 이메일: {userEmail || "-"}</p>
          <p className="break-all text-[12px] text-[#85908c]">계정 ID: {userId || "-"}</p>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading}
            className="mt-2 h-11 w-full rounded-xl bg-[#57bf8e] text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "내 정보 저장"}
          </button>
        </div>
      )}
    </div>
  );
}
