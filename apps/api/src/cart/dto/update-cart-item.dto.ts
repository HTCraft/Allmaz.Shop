import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(0) // 0 = удалить позицию из корзины
  quantity!: number;
}
