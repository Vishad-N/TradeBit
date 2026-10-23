import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
@SkipThrottle()
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Cheap liveness probe for uptime bots: never touches the database, so it keeps Render awake without waking Neon. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get()
  async check() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up', time: new Date().toISOString() };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
