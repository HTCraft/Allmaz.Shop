import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

type AuthedRequest = Request & { user: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly service: AddressesService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.service.list(req.user.userId);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateAddressDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.service.update(req.user.userId, id, dto);
  }

  @Post(':id/default')
  setDefault(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.setDefault(req.user.userId, id);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.userId, id);
  }
}
