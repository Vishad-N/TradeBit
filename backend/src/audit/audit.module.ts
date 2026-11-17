import { Controller, Get, Module, Param, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, Roles } from '../auth/auth.guard';

/** Admin-only trail of deletions: who, what, when, and (on the single-item route) the snapshot needed to put it back. */
@Controller('admin/audit')
@UseGuards(AuthGuard)
@Roles('ADMIN')
class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('entity') entity?: string) {
    return this.prisma.adminAudit.findMany({
      where: entity ? { entity } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, adminEmail: true, action: true, entity: true, entityId: true, label: true, createdAt: true },
    });
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const row = await this.prisma.adminAudit.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Audit entry not found');
    return row;
  }
}

@Module({ controllers: [AuditController] })
export class AuditModule {}
