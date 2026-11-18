import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { prisma } from '@ecommerce/database';

export interface JwtPayload {
  sub: string;
  email: string;
}

function extractJwtFromCookie(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    // Тянем актуальную роль из БД на каждый запрос — чтобы смена роли
    // администратором применялась сразу, без переlogина пользователя
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Возвращаемый объект попадёт в req.user
    return { userId: user.id, email: user.email, role: user.role };
  }
}
