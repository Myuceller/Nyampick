export interface ChildSummaryDto {
  id: string;
  name: string;
  monthsOld: number;
  isPrimary: boolean;
  photoUrl?: string;
  allergies?: string[];
  babyFoodStartedOn?: string | null;
}

export interface LinkedInfoDto {
  ownerName?: string;
  ownerEmail?: string;
  childName?: string;
}

export interface ChildrenResponseDto {
  children?: ChildSummaryDto[];
  linkedMode?: boolean;
  linkedInfo?: LinkedInfoDto | null;
  message?: string;
}
