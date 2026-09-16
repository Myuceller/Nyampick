export type PolicyKey = "service" | "privacy" | "marketing";

export interface PolicySection {
  title: string;
  body: string;
}

export interface PolicyContent {
  title: string;
  sections: PolicySection[];
}

export const REQUIRED_AUTH_POLICY_KEYS = ["service", "privacy"] as const;

export const AUTH_POLICY_CONTENT: Record<PolicyKey, PolicyContent> = {
  service: {
    title: "서비스 이용약관",
    sections: [
      {
        title: "제1조 목적",
        body: "이 약관은 냠픽이 제공하는 이유식 식단 기록, 재료 관리, 레시피 추천, 식단표 내보내기 등 서비스의 이용 조건과 절차를 정합니다.",
      },
      {
        title: "제2조 서비스의 제공",
        body: "냠픽은 이유식 식단 기록, 냉장고 재료 관리, 가족 공유, AI 레시피 추천, 식단표 저장 기능을 제공합니다.",
      },
      {
        title: "제3조 의료 정보가 아님",
        body: "서비스의 이유식 정보, 월령별 재료 안내, 알레르기 안내, 레시피 추천은 일반 참고용 정보이며 의료 상담을 대체하지 않습니다.",
      },
      {
        title: "제4조 계정 관리",
        body: "회원은 본인의 계정을 안전하게 관리해야 하며, 계정 도용 또는 제3자 사용이 의심되는 경우 운영자에게 알려야 합니다.",
      },
    ],
  },
  privacy: {
    title: "개인정보 수집 및 이용 동의",
    sections: [
      {
        title: "1. 수집 및 이용 목적",
        body: "냠픽은 회원가입, 로그인, 계정 복구, 식단 기록 저장, 가족 연동, 서비스 문의 대응을 위해 필요한 정보를 처리합니다.",
      },
      {
        title: "2. 처리하는 정보",
        body: "이메일 주소, 소셜 계정 식별값, 보호자 닉네임, 아기 별명, 아기 개월수, 식단 기록, 냉장고 재료, 레시피 저장 내역이 처리될 수 있습니다.",
      },
      {
        title: "3. 보유 기간",
        body: "개인정보는 회원 탈퇴 또는 직접 삭제 시까지 보관되며, 법령상 보관이 필요한 정보는 정해진 기간 동안 보관될 수 있습니다.",
      },
      {
        title: "4. 동의 거부 권리",
        body: "개인정보 수집 및 이용에 동의하지 않을 수 있으나, 필수 정보 처리가 제한되면 회원가입과 서비스 이용이 제한될 수 있습니다.",
      },
    ],
  },
  marketing: {
    title: "광고성 정보 수신 동의",
    sections: [
      {
        title: "1. 수신 목적",
        body: "이벤트, 혜택, 신규 기능, 프로모션, 제휴 안내 등 광고성 정보를 이메일 또는 앱 푸시 등으로 전송할 수 있습니다.",
      },
      {
        title: "2. 동의 철회",
        body: "회원은 언제든지 서비스 내 알림 설정, 이메일 수신거부 링크 또는 고객 문의를 통해 광고성 정보 수신 동의를 철회할 수 있습니다.",
      },
    ],
  },
};
