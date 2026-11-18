import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCarouselSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoplay?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  intervalMs?: number;

  @IsOptional()
  @IsBoolean()
  showIndicators?: boolean;

  @IsOptional()
  @IsBoolean()
  showControls?: boolean;
}

export class CreateCarouselSlideDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCarouselSlideDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
