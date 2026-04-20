interface FamilyLinkCardProps {
  linkedMode: boolean;
  linkedOwnerLabel: string;
  onOpen: () => void;
}

export function FamilyLinkCard({
  linkedMode,
  linkedOwnerLabel,
  onOpen,
}: FamilyLinkCardProps) {
  return (
    <div className="rounded-2xl border border-[#cbd5d1] bg-white p-4">
      <h2 className="text-[18px] font-bold text-[#1f2725]">가족 연결</h2>
      <p className="mt-2 text-[14px] text-[#6f7875]">
        {linkedMode
          ? `연결됨${linkedOwnerLabel ? ` · ${linkedOwnerLabel}` : ""}`
          : "연결 안됨"}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 h-11 w-full rounded-xl border border-[#b8d6c7] bg-[#edf7f2] text-[15px] font-semibold text-[#2f8d68]"
      >
        아기/가족 관리 열기
      </button>
    </div>
  );
}
