import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePromoCodeDto {
  @IsString()
  @MinLength(3, { message: 'Код — минимум 3 символа' })
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Код: только латиница, цифры, _ и -' })
  code!: string;

  @IsIn(['PERCENT', 'FIXED'])
  discountType!: 'PERCENT' | 'FIXED';

  /** PERCENT — 1–100; FIXED — сумма в копейках (дополнительно проверяется в сервисе) */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  value!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** null / не указано — без лимита */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderCents?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class UpdatePromoCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Код: только латиница, цифры, _ и -' })
  code?: string;

  @IsOptional()
  @IsIn(['PERCENT', 'FIXED'])
  discountType?: 'PERCENT' | 'FIXED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  value?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderCents?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
