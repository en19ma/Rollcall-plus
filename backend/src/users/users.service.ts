import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async findAll(params: { role?: Role; search?: string; page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    const where: any = { deletedAt: null };
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
          student: true,
          lecturer: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pageCount: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        student: { include: { department: true } },
        lecturer: { include: { department: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createByAdmin(
    data: {
      name: string;
      email: string;
      password: string;
      role: Role;
      departmentId?: string;
    },
    actingUserId?: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        isEmailVerified: true,
      },
    });

    if (data.role === 'STUDENT' && data.departmentId) {
      await this.prisma.student.create({
        data: {
          userId: user.id,
          studentCode: `STU-${user.id.slice(0, 8).toUpperCase()}`,
          level: 'Level 100',
          programme: 'Undeclared',
          departmentId: data.departmentId,
        },
      });
    } else if (data.role === 'LECTURER' && data.departmentId) {
      await this.prisma.lecturer.create({
        data: {
          userId: user.id,
          staffCode: `LEC-${user.id.slice(0, 8).toUpperCase()}`,
          departmentId: data.departmentId,
          designation: 'Lecturer',
        },
      });
    }

    await this.auditLogs.log({
      userId: actingUserId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      metadata: { role: data.role, email: data.email },
    });

    return this.findOne(user.id);
  }

  async update(id: string, data: Partial<{ name: string; email: string }>) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data });
  }

  async remove(id: string, actingUserId?: string) {
    await this.findOne(id);
    const result = await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLogs.log({
      userId: actingUserId,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: id,
    });
    return result;
  }

  async updateStudentProfile(
    userId: string,
    data: Partial<{ level: string; programme: string; departmentId: string }>,
  ) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Student profile not found');
    return this.prisma.student.update({ where: { userId }, data });
  }
}
