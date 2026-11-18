import { IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsIn(['USER', 'ADMIN'])
  role!: 'USER' | 'ADMIN';
}

export class UpdateOrderStatusDto {
  @IsIn(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  status!: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}
