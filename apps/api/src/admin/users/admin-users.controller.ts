import { Body, Controller, Delete, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { AdminPaginationQueryDto } from '../dto/pagination.dto';

type AuthedRequest = Request & { user: { userId: string } };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  list(@Query() query: AdminPaginationQueryDto) {
    return this.service.list(query);
  }

  @Put(':id/role')
  updateRole(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.service.updateRole(id, dto.role, req.user.userId);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(id, req.user.userId);
  }
}
