import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const contactEmail = "kwdonggyu@gmail.com";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description:
    "냠픽 개인정보 처리방침입니다. 수집 항목, 이용 목적, 보관 기간, 제3자 처리, 이용자 권리를 안내합니다.",
  alternates: {
    canonical: "/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  {
    title: "1. 개인정보 처리자",
    body: [
      "냠픽은 아이 식단 기록, 냉장고 재료 관리, AI 레시피 추천 기능을 제공하는 서비스입니다.",
      "개인정보 처리자: Don",
      `문의: ${contactEmail}`,
    ],
  },
  {
    title: "2. 수집하는 개인정보",
    body: [
      "회원 가입 및 로그인: 이메일 주소, 소셜 로그인 제공자 식별 정보, 프로필 이름",
      "프로필 관리: 보호자 이름, 아이 이름, 아이 개월 수, 프로필 이미지",
      "서비스 이용 기록: 식단 기록, 냉장고 재료, 이유식 큐브, 가족 연동 정보, 저장한 레시피",
      "AI 추천 이용 시: 사용자가 선택한 재료, 요청 조건, 추천 결과와 서비스 품질 개선을 위한 처리 결과",
    ],
  },
  {
    title: "3. 개인정보 이용 목적",
    body: [
      "회원 식별, 로그인 유지, 계정 관리",
      "아이 식단 기록, 냉장고 재료 관리, 가족 공유 기능 제공",
      "보유 재료 기반 AI 레시피 추천과 추천 품질 개선",
      "오류 확인, 보안 점검, 서비스 안정성 개선",
      "문의 대응과 공지 전달",
    ],
  },
  {
    title: "4. 보관 및 파기",
    body: [
      "개인정보는 서비스 제공에 필요한 기간 동안 보관하며, 회원 탈퇴 또는 삭제 요청 시 지체 없이 삭제합니다.",
      "관련 법령상 보관 의무가 있는 정보는 해당 법령에서 정한 기간 동안 분리하여 보관할 수 있습니다.",
      "백업, 로그, 보안 기록에 포함된 정보는 시스템 운영상 필요한 최소 기간 동안 보관 후 삭제됩니다.",
    ],
  },
  {
    title: "5. 외부 서비스 이용",
    body: [
      "냠픽은 인증과 데이터 저장을 위해 Supabase를 사용할 수 있습니다.",
      "냠픽은 AI 레시피 추천 생성을 위해 OpenAI API를 사용할 수 있습니다.",
      "소셜 로그인 사용 시 Google 또는 Kakao가 제공하는 인증 정보가 처리될 수 있습니다.",
      "외부 서비스에는 서비스 제공에 필요한 최소한의 정보만 전달되도록 관리합니다.",
    ],
  },
  {
    title: "6. 이용자의 권리",
    body: [
      "이용자는 본인의 개인정보 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다.",
      `계정 삭제 또는 개인정보 관련 요청은 ${contactEmail}로 문의할 수 있습니다.`,
      "요청이 접수되면 본인 확인 후 합리적인 기간 내에 처리합니다.",
    ],
  },
  {
    title: "7. 안전성 확보 조치",
    body: [
      "냠픽은 인증이 필요한 API를 보호하고, 사용자별 데이터 접근 범위를 제한합니다.",
      "운영 환경의 비밀 값과 API 키는 공개 저장소에 커밋하지 않으며, 배포 환경 변수로 관리합니다.",
      "서비스 개선 과정에서 불필요한 개인정보 수집과 로그 기록을 최소화합니다.",
    ],
  },
  {
    title: "8. 정책 변경",
    body: [
      "본 개인정보 처리방침은 서비스 기능, 운영 방식, 관련 법령 변경에 따라 수정될 수 있습니다.",
      "중요한 변경이 있는 경우 서비스 화면 또는 별도 안내를 통해 고지합니다.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] px-5 pb-12 pt-8 text-[#202725]">
      <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4d6b5e]">
        <ArrowLeft className="h-4 w-4" />
        냠픽으로 돌아가기
      </Link>

      <h1 className="mt-10 text-[24px] font-extrabold">개인정보 처리방침</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-[#65716d]">
        시행일: 2026년 5월 3일
        <br />
        개인정보 처리자: Don · 문의:{" "}
        <a className="font-bold text-[#2f9569]" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
      </p>

      <section className="mt-8 space-y-7 text-[15px] leading-[1.75] text-[#4d5753]">
        {sections.map((section) => (
          <article key={section.title}>
            <h2 className="text-[18px] font-extrabold text-[#202725]">{section.title}</h2>
            <ul className="mt-2 space-y-1.5">
              {section.body.map((item) => (
                <li key={item} className="pl-3 before:mr-2 before:content-['-']">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
