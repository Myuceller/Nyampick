export interface ProfileDto {
  id: string;
  name: string;
  babyName: string;
  babyMonthsOld: number;
  email?: string;
}

export interface ProfileResponseDto {
  profile?: ProfileDto;
  message?: string;
}
