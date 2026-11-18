import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt({ message: 'Оценка должна быть целым числом' })
  @Min(1, { message: 'Оценка — от 1 до 5' })
  @Max(5, { message: 'Оценка — от 1 до 5' })
  rating!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Отзыв слишком короткий' })
  @MaxLength(2000, { message: 'Отзыв не должен превышать 2000 символов' })
  text!: string;
}

export class ReviewsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}
