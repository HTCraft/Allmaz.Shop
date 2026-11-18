import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MinLength(5, { message: 'Укажите полный адрес доставки' })
  shippingAddress!: string;

  @IsString()
  @MinLength(5, { message: 'Укажите корректный телефон' })
  phone!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsIn(['COD', 'CARD'])
  paymentMethod?: 'COD' | 'CARD';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoCode?: string;
}
