import { IsString, MaxLength, MinLength } from 'class-validator';

export class ValidatePromoCodeDto {
  @IsString()
  @MinLength(1, { message: 'Введите промокод' })
  @MaxLength(64)
  code!: string;
}
