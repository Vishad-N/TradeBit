import { Body, ConflictException, Controller, Get, Global, HttpCode, Injectable, Logger, Module, OnModuleInit, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, AuthUser, CurrentUser } from './auth.guard';
import { LoginDto, RegisterDto } from './auth.dto';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 16) {
  throw new Error('JWT_SECRET must be set (16+ characters)');
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly log = new Logger('Auth');
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  /** Creates/updates the first admin from ADMIN_EMAIL + ADMIN_PASSWORD. Self-service sign-up can never create admins. */
  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await this.prisma.user.create({ data: { email, name: process.env.ADMIN_NAME || 'Admin', passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' } });
    } else if (existing.role !== 'ADMIN' || !(await bcrypt.compare(password, existing.passwordHash))) {
      // The configured password changed (or the account was demoted): apply it and sign out every old session.
      await this.prisma.user.update({ where: { email }, data: { role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12), tokenVersion: { increment: 1 } } });
    }
    this.log.log(`Admin account ready: ${email}`);
  }

  private async sign(user: { id: string; email: string; name: string; role: string; tokenVersion: number }) {
    return {
      token: await this.jwt.signAsync({ sub: user.id, v: user.tokenVersion }),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    // Deliberately vague: it should not read as a "does this email have an account?" lookup. (Fully closing that gap
    // needs email verification; the sign-up route is also rate limited.)
    const taken = () => new ConflictException('We could not create an account with those details. If you already registered, please log in instead.');
    if (await this.prisma.user.findUnique({ where: { email } })) throw taken();
    const phone = dto.phone.trim();
    try {
      const user = await this.prisma.user.create({
        data: { email, name: dto.name.trim(), phone, passwordHash: await bcrypt.hash(dto.password, 12), role: 'USER' },
      });
      return this.sign(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw taken(); // two sign-ups at once
      throw e;
    }
  }

  /** Signs the user out of every device: all tokens issued so far stop working. */
  async logoutEverywhere(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    // Same message for unknown email and wrong password.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.sign(user);
  }
}

@Controller('auth')
class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: AuthUser) {
    await this.auth.logoutEverywhere(user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }
}

@Global()
@Module({
  imports: [JwtModule.register({ secret, signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any } })],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
