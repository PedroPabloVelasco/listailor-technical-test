import { IsString, Length } from 'class-validator';

export class VerifyMagicLinkDto {
  @IsString()
  @Length(16, 512)
  token!: string;
}
