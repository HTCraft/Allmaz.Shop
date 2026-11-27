import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class SalesQueryDto {
  /** «Последние N дней» — быстрый выбор периода; если заданы from/to, они главнее */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  days?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата начала — в формате ГГГГ-ММ-ДД' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата окончания — в формате ГГГГ-ММ-ДД' })
  to?: string;
}
