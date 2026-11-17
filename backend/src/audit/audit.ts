import { BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

const log = new Logger('AdminAudit');

/** Who did it, as the guards put it on the request. */
export type Actor = { id: string; email: string };

const norm = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Server-side "type the name to confirm". The browser asks the admin to type the item's exact name and sends it as `?confirm=`;
 * a bare DELETE request (a stray click, a script, a replayed request) is refused. Not a secret: it only has to be deliberate.
 */
export function assertTyped(confirm: string | undefined, expected: string, what: string) {
  if (typeof confirm === 'string' && norm(confirm) === norm(expected) && norm(expected) !== '') return;
  throw new BadRequestException({
    code: 'CONFIRM_REQUIRED',
    message: `This removes ${what} from the site (it is archived, never erased). Type its exact name "${expected}" to confirm.`,
  });
}

/**
 * Writes who deleted what, and a full snapshot of the rows that are about to go (including everything that cascades with
 * them), so a deletion can be traced and the data put back. Call it BEFORE the delete. A failure to write the audit row is
 * logged loudly but never blocks the admin's action.
 */
export async function auditDelete(prisma: PrismaService, actor: Actor | undefined, entity: string, entityId: string, label: string, snapshot?: unknown, action = 'DELETE') {
  log.warn(`${action} ${entity} "${label}" (${entityId}) by ${actor?.email ?? 'unknown'}`);
  try {
    await prisma.adminAudit.create({
      data: {
        adminId: actor?.id ?? null,
        adminEmail: actor?.email ?? 'unknown',
        action,
        entity,
        entityId,
        label: label.slice(0, 300),
        snapshot: snapshot === undefined ? Prisma.JsonNull : (JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue),
      },
    });
  } catch (e) {
    log.error(`Could not write the audit row for ${entity} ${entityId}: ${(e as Error).message}`);
  }
}
