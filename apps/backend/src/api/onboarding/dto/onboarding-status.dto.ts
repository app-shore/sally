import { IsNotEmpty, IsNumber, IsBoolean, IsObject, IsString } from 'class-validator';

export interface OnboardingItem {
  id: string;
  title: string;
  complete: boolean;
  metadata: Record<string, any>;
}

export interface OnboardingStatusResponse {
  overallProgress: number;
  criticalComplete: boolean;
  recommendedComplete: boolean;
  optionalComplete: boolean;
  items: {
    critical: OnboardingItem[];
    recommended: OnboardingItem[];
    optional: OnboardingItem[];
  };
}

export class OnboardingStatusDto {
  @IsNumber()
  @IsNotEmpty()
  overallProgress: number;

  @IsBoolean()
  @IsNotEmpty()
  criticalComplete: boolean;

  @IsBoolean()
  @IsNotEmpty()
  recommendedComplete: boolean;

  @IsBoolean()
  @IsNotEmpty()
  optionalComplete: boolean;

  @IsObject()
  @IsNotEmpty()
  items: {
    critical: OnboardingItem[];
    recommended: OnboardingItem[];
    optional: OnboardingItem[];
  };
}
