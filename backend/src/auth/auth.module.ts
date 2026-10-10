import { Body, ConflictException, Controller, Get, Global, HttpCode, Injectable, Logger, Module, OnModuleInit, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
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
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', passwordHash },
      create: { email, name: process.env.ADMIN_NAME || 'Admin', passwordHash, role: 'ADMIN' },
    });
    this.log.log(`Admin account ready: ${email}`);
  }

  private async sign(user: { id: string; email: string; name: string; role: string }) {
    return {
      token: await this.jwt.signAsync({ sub: user.id }),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('An account with this email already exists');
    const phone = dto.phone.trim();
    const user = await this.prisma.user.create({
      data: { email, name: dto.name.trim(), phone, passwordHash: await bcrypt.hash(dto.password, 12), role: 'USER' },
    });
    return this.sign(user);
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
