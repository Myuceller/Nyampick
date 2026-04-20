"use client";

import { BabyCard } from "./my-page/baby-card";
import { FamilyLinkCard } from "./my-page/family-link-card";
import { ProfileCard } from "./my-page/profile-card";
import { useMyPage } from "./my-page/use-my-page";

export function MyPage() {
  const vm = useMyPage();

  return (
    <main className="flex-1 px-4 pb-28 pt-4">
      <div className="space-y-3">
        <ProfileCard
          loading={vm.loading}
          saving={vm.saving}
          userEmail={vm.userEmail}
          userId={vm.userId}
          profileName={vm.profileName}
          onProfileNameChange={vm.setProfileName}
          onSave={() => {
            void vm.saveProfile();
          }}
        />

        <BabyCard
          loading={vm.loading}
          saving={vm.babySaving}
          linkedMode={vm.linkedMode}
          babyName={vm.babyName}
          babyMonthsOld={vm.babyMonthsOld}
          onBabyNameChange={vm.setBabyName}
          onBabyMonthsOldChange={vm.setBabyMonthsOld}
          onSave={() => {
            void vm.saveBabyProfile();
          }}
        />

        <FamilyLinkCard
          linkedMode={vm.linkedMode}
          linkedOwnerLabel={vm.linkedOwnerLabel}
          onOpen={vm.openFamilyPage}
        />

        {vm.error ? (
          <div className="rounded-xl border border-[#f0c7c7] bg-[#fff6f6] p-3 text-[13px] text-[#bf5555]">
            {vm.error}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          void vm.logout();
        }}
        className="mt-4 h-12 w-full rounded-2xl bg-[#1f2725] text-[16px] font-semibold text-white"
      >
        로그아웃
      </button>
    </main>
  );
}
