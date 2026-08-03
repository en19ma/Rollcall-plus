import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  findAll(params: { search?: string; departmentId?: string; lecturerId?: string }) {
    const where: any = { deletedAt: null };
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { courseCode: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.lecturerId) where.lecturerId = params.lecturerId;

    rreturn this.prisma.course.findMany({
      where,
      include: {
        department: true,
        lecturer: { include: { user: true } },
        _count: { select: { enrollments: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: { department: true, lecturer: { include: { user: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(dto: CreateCourseDto, actingUserId?: string) {
    const course = await this.prisma.course.create({ data: dto });
    await this.auditLogs.log({
      userId: actingUserId,
      action: 'COURSE_CREATED',
      entity: 'Course',
      entityId: course.id,
      metadata: { courseCode: dto.courseCode, title: dto.title },
    });
    return course;
  }

  async update(id: string, data: Partial<CreateCourseDto>) {
    await this.findOne(id);
    return this.prisma.course.update({ where: { id }, data });
  }

  async assignLecturer(id: string, lecturerId: string, actingUserId?: string) {
    await this.findOne(id);
    const updated = await this.prisma.course.update({ where: { id }, data: { lecturerId } });
    await this.auditLogs.log({
      userId: actingUserId,
      action: 'COURSE_LECTURER_ASSIGNED',
      entity: 'Course',
      entityId: id,
      metadata: { lecturerId },
    });
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getEnrolledStudents(courseId: string) {
    await this.findOne(courseId);
    return this.prisma.enrollment.findMany({
      where: { courseId, deletedAt: null },
      include: { student: { include: { user: true } } },
    });
  }
}
