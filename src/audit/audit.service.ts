import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditLogInput = {
  action: string;
  entity: string;
  entityId: string;
  description: string;
  performedById?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        description: input.description,
        performedById: input.performedById,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
