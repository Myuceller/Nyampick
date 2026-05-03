import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const contactEmail = "kwdonggyu@gmail.com";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "냠픽 서비스 이용약관입니다. 서비스 이용 조건, 사용자 책임, AI 추천 안내, 계정 관리 기준을 안내합니다.",
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  {
    title: "1. 목적",
    body: [
      "본 약관은 Don이 운영하는 냠픽 서비스의 이용 조건과 사용자와 운영자 사이의 권리, 의무, 책임 사항을 정합니다.",
      "냠픽은 아이 식단 기록, 냉장고 재료 관리, 가족 공유, AI 레시피 추천 기능을 제공하는 모바일 웹 서비스입니다.",
    ],
  },
  {
    title: "2. 계정 및 로그인",
    body: [
      "사용자는 이메일 또는 소셜 로그인을 통해 냠픽 계정을 만들고 서비스를 이용할 수 있습니다.",
      "사용자는 본인의 계정 정보를 안전하게 관리해야 하며, 계정 사용으로 발생하는 활동에 대한 책임을 집니다.",
      "타인의 계정 또는 허위 정보를 이용해 서비스를 사용하는 행위는 제한될 수 있습니다.",
    ],
  },
  {
    title: "3. 서비스 이용",
    body: [
      "사용자는 아이 프로필, 식단 기록, 냉장고 재료, 가족 연동 정보를 입력하고 관리할 수 있습니다.",
      "서비스는 안정적인 운영을 위해 기능을 변경, 개선, 중단할 수 있으며 중요한 변경 사항은 가능한 방법으로 안내합니다.",
      "사용자는 서비스 이용 과정에서 법령, 본 약관, 타인의 권리를 침해해서는 안 됩니다.",
    ],
  },
  {
    title: "4. AI 레시피 추천 안내",
    body: [
      "AI 레시피 추천은 식단 아이디어 제공을 위한 보조 기능이며, 의료 또는 영양 전문 상담을 대체하지 않습니다.",
      "아이의 월령, 알레르기, 질환, 섭취 이력, 보호자의 판단에 따라 추천 결과를 반드시 확인해야 합니다.",
      "알레르기 가능 재료나 처음 먹는 재료는 소량부터 확인하고, 필요한 경우 전문가와 상담해야 합니다.",
      "운영자는 추천 품질을 높이기 위해 안전 문구, 출처, 조리 단계, 재료 조합을 점검하는 품질 게이트를 적용할 수 있습니다.",
    ],
  },
  {
    title: "5. 사용자 콘텐츠",
    body: [
      "사용자가 입력한 식단 기록, 냉장고 재료, 프로필 이미지는 사용자의 서비스 이용을 위해 처리됩니다.",
      "사용자는 본인이 입력한 정보가 정확하고 적법한지 확인해야 합니다.",
      "운영자는 서비스 보안, 법령 준수, 장애 대응에 필요한 범위에서 사용자 콘텐츠를 처리할 수 있습니다.",
    ],
  },
  {
    title: "6. 금지 행위",
    body: [
      "서비스를 비정상적으로 호출하거나 자동화 도구로 과도한 요청을 보내는 행위",
      "타인의 계정, 개인정보, 식단 기록을 무단으로 조회하거나 사용하는 행위",
      "서비스의 보안, 데이터, 운영 환경을 침해하거나 방해하는 행위",
      "불법적이거나 부적절한 내용을 입력해 서비스 목적과 다르게 사용하는 행위",
    ],
  },
  {
    title: "7. 책임의 한계",
    body: [
      "냠픽은 사용자가 입력한 정보와 외부 AI 모델의 응답을 기반으로 결과를 제공합니다.",
      "추천 결과의 최종 적용 여부는 보호자가 판단해야 하며, 아이의 건강과 안전에 관한 결정은 전문가 조언을 우선해야 합니다.",
      "운영자는 천재지변, 외부 서비스 장애, 네트워크 문제 등 합리적으로 통제하기 어려운 사유로 인한 서비스 중단에 대해 책임을 제한할 수 있습니다.",
    ],
  },
  {
    title: "8. 계정 삭제 및 문의",
    body: [
      `사용자는 계정 삭제, 개인정보 삭제, 서비스 이용 관련 문의를 ${contactEmail}로 요청할 수 있습니다.`,
      "운영자는 요청 내용을 확인한 뒤 합리적인 기간 내에 처리합니다.",
    ],
  },
  {
    title: "9. 약관 변경",
    body: [
      "본 약관은 서비스 기능, 운영 정책, 관련 법령 변경에 따라 수정될 수 있습니다.",
      "중요한 변경 사항은 서비스 화면 또는 별도 안내를 통해 고지합니다.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-[#fdfefd] px-5 pb-12 pt-8 text-[#202725]">
      <Link href="/landing" className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4d6b5e]">
        <ArrowLeft className="h-4 w-4" />
        냠픽으로 돌아가기
      </Link>

      <h1 className="mt-10 text-[30px] font-extrabold">이용약관</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-[#65716d]">
        시행일: 2026년 5월 3일
        <br />
        운영자: Don · 문의:{" "}
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
