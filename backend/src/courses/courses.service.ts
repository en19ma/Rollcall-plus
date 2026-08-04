import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    if (dto.lecturerId) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id: dto.lecturerId } });
    if (!lecturer || lecturer.departmentId !== dto.departmentId) {
      throw new BadRequestException('Selected lecturer is not in the chosen department');
    }
  }
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
  const course = await this.findOne(id);
  const lecturer = await this.prisma.lecturer.findUnique({ where: { id: lecturerId } });
  if (!lecturer) throw new NotFoundException('Lecturer not found');
  if (lecturer.departmentId !== course.departmentId) {
    throw new BadRequestException('This lecturer is not in the same department as the course');
  }
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

async claimCourse(courseId: string, lecturerUserId: string) {
  const lecturer = await this.prisma.lecturer.findUnique({ where: { userId: lecturerUserId } });
  if (!lecturer) throw new ForbiddenException('Only lecturers can register to teach a course');

  const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
  if (!course) throw new NotFoundException('Course not found');
  if (course.departmentId !== lecturer.departmentId) {
    throw new ForbiddenException('You can only teach courses in your own department');
  }
  if (course.lecturerId) {
    throw new ConflictException('This course already has a lecturer assigned');
  }

  const result = await this.prisma.course.updateMany({
    where: { id: courseId, lecturerId: null },
    data: { lecturerId: lecturer.id },
  });
  if (result.count === 0) {
    // Someone else claimed it in the split second between our check above and this write.
    throw new ConflictException('This course already has a lecturer assigned');
  }

  await this.auditLogs.log({
    userId: lecturerUserId,
    action: 'COURSE_LECTURER_SELF_ASSIGNED',
    entity: 'Course',
    entityId: courseId,
    metadata: { lecturerId: lecturer.id },
  });

  return this.findOne(courseId);
}
  async getEnrolledStudents(courseId: string) {
    await this.findOne(courseId);
    return this.prisma.enrollment.findMany({
      where: { courseId, deletedAt: null },
      include: { student: { include: { user: true } } },
    });
  }
}
