import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Enrollment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async create(dto: CreateEnrollmentDto, actingUserId?: string) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: dto.studentId, courseId: dto.courseId } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Student is already enrolled in this course');
    }
    let enrollment: Enrollment;
    if (existing && existing.deletedAt) {
      enrollment = await this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { deletedAt: null, enrollmentDate: new Date() },
      });
    } else {
      enrollment = await this.prisma.enrollment.create({ data: dto });
    }
    await this.auditLogs.log({
      userId: actingUserId,
      action: 'STUDENT_ENROLLED',
      entity: 'Enrollment',
      entityId: enrollment.id,
      metadata: { studentId: dto.studentId, courseId: dto.courseId },
    });
    return enrollment;
  }

  /** Self-service enrollment — studentId is resolved from the logged-in user, never from the request body. */
  async selfEnroll(studentUserId: string, courseId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new ForbiddenException('Only students can register for courses');

    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');

    return this.create({ studentId: student.id, courseId }, studentUserId);
  }

  /** Self-service drop — a student may only remove their own enrollment. */
  async selfDrop(studentUserId: string, courseId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new ForbiddenException('Only students can drop courses');

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId } },
    });
    if (!enrollment || enrollment.deletedAt) throw new NotFoundException('You are not enrolled in this course');

    return this.remove(enrollment.id, studentUserId);
  }

  async bulkCreate(courseId: string, studentIds: string[], actingUserId?: string) {
    const results: Enrollment[] = [];
    for (const studentId of studentIds) {
      try {
        results.push(await this.create({ studentId, courseId }, actingUserId));
      } catch {
        // skip duplicates silently in bulk mode
      }
    }
    return { enrolled: results.length, total: studentIds.length };
  }

  findForStudent(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: { studentId, deletedAt: null },
      include: { course: { include: { lecturer: { include: { user: true } } } } },
    });
  }

  async remove(id: string, actingUserId?: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    const result = await this.prisma.enrollment.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLogs.log({
      userId: actingUserId,
      action: 'STUDENT_UNENROLLED',
      entity: 'Enrollment',
      entityId: id,
    });
    return result;
  }
}
