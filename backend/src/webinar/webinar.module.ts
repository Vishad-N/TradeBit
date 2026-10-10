import { Body, Controller, Get, HttpCode, Injectable, Module, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { PHONE_MESSAGE, PHONE_PATTERN } from '../common-phone';

/** Sign-ups from the /tt-1 webinar page (both the popup and the on-page form). */
class RegistrationDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsEmail() @MaxLength(160) email: string;
  // One of the offered country codes followed by exactly 10 digits.
  @IsString() @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE }) phone: string;
  @IsOptional() @IsString() @MaxLength(3) country?: string;
  @IsOptional() @IsIn(['popup', 'page']) source?: string;
}

@Injectable()
export class WebinarService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegistrationDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    // The same person submitting twice (popup then page, or a double click) is stored once.
    const existing = await this.prisma.webinarRegistration.findFirst({ where: { email, phone } });
    if (existing) return { ok: true };
    await this.prisma.webinarRegistration.create({
      data: { name: dto.name.trim(), email, phone, country: dto.country?.toUpperCase() || null, source: dto.source || 'page' },
    });
    return { ok: true };
  }

  list(search?: string) {
    const q = search?.trim();
    return this.prisma.webinarRegistration.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  }
}

@Controller('webinar')
class WebinarPublicController {
  constructor(private readonly svc: WebinarService) {}

  @Post('registrations')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  register(@Body() dto: RegistrationDto) {
    return this.svc.register(dto);
  }
}

@Controller('admin/webinar')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class WebinarAdminController {
  constructor(private readonly svc: WebinarService) {}

  @Get('registrations')
  list(@Query('search') search?: string) {
    return this.svc.list(search);
  }
}

@Module({ controllers: [WebinarPublicController, WebinarAdminController], providers: [WebinarService] })
export class WebinarModule {}
