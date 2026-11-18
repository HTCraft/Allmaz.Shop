import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Новый пароль должен быть не короче 8 символов' })
  newPassword!: string;
}
