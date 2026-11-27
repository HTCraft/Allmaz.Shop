import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsString()
  @MinLength(5, { message: 'Укажите полный адрес доставки' })
  @MaxLength(300)
  address!: string;

  @IsString()
  @MinLength(5, { message: 'Укажите корректный телефон' })
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Укажите полный адрес доставки' })
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Укажите корректный телефон' })
  @MaxLength(32)
  phone?: string;

  /** Только true: основной адрес нельзя «снять» — его заменяют, назначив основным другой */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
