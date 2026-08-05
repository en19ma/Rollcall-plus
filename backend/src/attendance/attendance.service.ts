import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AttendanceRecord, AttendanceStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CheckInDto, CheckInBySessionDto, ManualMarkDto } from './dto/mark-attendance.dto';

// Haversine distance in meters between two lat/lng points.
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Students must be within this distance of the lecturer's location to check in.
// Fixed at 30 meters — not client-configurable.
const ATTENDANCE_RADIUS_METERS = 3000;

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private auditLogs: AuditLogsService,
    private systemSettings: SystemSettingsService,
  ) {}

  // ---------- Session lifecycle (Lecturer) ----------

  async createSession(lecturerUserId: string, dto: CreateSessionDto) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { userId: lecturerUserId } });
    if (!lecturer) throw new ForbiddenException('Only lecturers can start attendance sessions');

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, deletedAt: null },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.lecturerId !== lecturer.id) {
      throw new ForbiddenException('You are not assigned to this course');
    }

    const qrToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + dto.durationMinutes * 60 * 1000);

    const session = await this.prisma.attendanceSession.create({
      data: {
        courseId: dto.courseId,
        createdById: lecturerUserId,
        lecturerId: lecturer.id,
        qrToken,
        expiresAt,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: ATTENDANCE_RADIUS_METERS,
        status: SessionStatus.OPEN,
      },
    });

    // Pre-create ABSENT records for every enrolled student so the roster is complete
    // from the start; check-ins / manual marks simply update these records.
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId: dto.courseId, deletedAt: null },
      include: { student: { select: { userId: true } } },
    });
    if (enrollments.length > 0) {
      await this.prisma.attendanceRecord.createMany({
        data: enrollments.map((e) => ({
          sessionId: session.id,
          studentId: e.studentId,
          status: AttendanceStatus.ABSENT,
        })),
        skipDuplicates: true,
      });

      await this.notifications.createMany(
        enrollments.map((e) => e.student.userId),
        'Attendance is open',
        `${course.courseCode} — ${course.title}: attendance just opened. Check in within ${dto.durationMinutes} minutes.`,
        'attendance_open',
      );
    }

    await this.auditLogs.log({
      userId: lecturerUserId,
      action: 'ATTENDANCE_SESSION_STARTED',
      entity: 'AttendanceSession',
      entityId: session.id,
      metadata: { courseId: dto.courseId, durationMinutes: dto.durationMinutes },
    });

    return session;
  }

  async getQrPayload(sessionId: string, lecturerUserId: string) {
    const session = await this.getSessionOwned(sessionId, lecturerUserId);
    return {
      sessionId: session.id,
      qrToken: session.qrToken,
      expiresAt: session.expiresAt,
      status: session.status,
    };
  }

  private async getSessionOwned(sessionId: string, lecturerUserId: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      include: { lecturer: true },
    });
    if (!session) throw new NotFoundException('Attendance session not found');
    if (session.lecturer.userId !== lecturerUserId) {
      throw new ForbiddenException('You do not own this attendance session');
    }
    return session;
  }

  async closeSession(sessionId: string, lecturerUserId: string) {
    const session = await this.getSessionOwned(sessionId, lecturerUserId);
    const updated = await this.prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.CLOSED },
    });
    await this.recalculateAndAlert(session.courseId);
    await this.auditLogs.log({
      userId: lecturerUserId,
      action: 'ATTENDANCE_SESSION_CLOSED',
      entity: 'AttendanceSession',
      entityId: session.id,
    });
    return updated;
  }

  async lockSession(sessionId: string, lecturerUserId: string) {
    const session = await this.getSessionOwned(sessionId, lecturerUserId);
    await this.prisma.attendanceRecord.updateMany({
      where: { sessionId },
      data: { locked: true },
    });
    const updated = await this.prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.LOCKED },
    });
    await this.auditLogs.log({
      userId: lecturerUserId,
      action: 'ATTENDANCE_SESSION_LOCKED',
      entity: 'AttendanceSession',
      entityId: session.id,
    });
    return updated;
  }

  // ---------- Student check-in (QR or session pick) ----------

  async checkIn(studentUserId: string, dto: CheckInDto) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { qrToken: dto.qrToken },
    });
    if (!session || session.deletedAt) throw new NotFoundException('Invalid attendance code');
    return this.performCheckIn(studentUserId, session.id, dto.latitude, dto.longitude);
  }

  async checkInBySession(studentUserId: string, dto: CheckInBySessionDto) {
    return this.performCheckIn(studentUserId, dto.sessionId, dto.latitude, dto.longitude);
  }

  private async performCheckIn(
    studentUserId: string,
    sessionId: string,
    latitude?: number,
    longitude?: number,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: true },
    });
    if (!student) throw new ForbiddenException('Only students can check in to attendance');

    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      include: { course: true },
    });
    if (!session) throw new NotFoundException('Attendance session not found');
    if (session.status !== SessionStatus.OPEN) {
      throw new BadRequestException('This attendance session is no longer open');
    }
    if (session.expiresAt < new Date()) {
      await this.prisma.attendanceSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.CLOSED },
      });
      throw new BadRequestException('This attendance session has expired');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: session.courseId } },
    });
    if (!enrollment || enrollment.deletedAt) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    if (session.latitude != null && session.longitude != null && session.radiusMeters) {
      if (latitude == null || longitude == null) {
        throw new BadRequestException(
          'Location access is required to check in — please enable it and try again',
        );
      }
      const dist = distanceMeters(session.latitude, session.longitude, latitude, longitude);
      if (dist > session.radiusMeters) {
        throw new ForbiddenException('You are too far from the class location to check in');
      }
    }

    const now = new Date();
    const minutesSinceStart = (now.getTime() - session.createdAt.getTime()) / 60000;
    const status = minutesSinceStart > 10 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    const record = await this.prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
      update: {
        status,
        checkedInAt: now,
      },
      create: {
        sessionId: session.id,
        studentId: student.id,
        status,
        checkedInAt: now,
      },
    });

    await this.notifications.create(
      session.createdById,
      'Student checked in',
      `${student.user.name} checked in for ${session.course.courseCode} — ${session.course.title}.`,
      'check_in',
    );

    return record;
  }

  /** Open, non-expired sessions for courses the given student is enrolled in. */
  async getOpenSessionsForStudent(studentUserId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new ForbiddenException('Only students can view check-in options');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id, deletedAt: null },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        courseId: { in: courseIds },
        deletedAt: null,
        status: SessionStatus.OPEN,
        expiresAt: { gt: new Date() },
      },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });

    // Don't re-offer a course session the student already checked into.
    const existingRecords = await this.prisma.attendanceRecord.findMany({
      where: { studentId: student.id, sessionId: { in: sessions.map((s) => s.id) }, checkedInAt: { not: null } },
      select: { sessionId: true },
    });
    const checkedInSessionIds = new Set(existingRecords.map((r) => r.sessionId));

    return sessions.map((s) => ({
      sessionId: s.id,
      course: { id: s.course.id, courseCode: s.course.courseCode, title: s.course.title },
      expiresAt: s.expiresAt,
      requiresLocation: s.latitude != null && s.longitude != null && !!s.radiusMeters,
      alreadyCheckedIn: checkedInSessionIds.has(s.id),
    }));
  }

  /** Open sessions across all of a lecturer's courses, for a one-click "end attendance" list. */
  async getOpenSessionsForLecturer(lecturerUserId: string) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { userId: lecturerUserId } });
    if (!lecturer) throw new ForbiddenException('Only lecturers can view this');

    const sessions = await this.prisma.attendanceSession.findMany({
      where: { lecturerId: lecturer.id, deletedAt: null, status: SessionStatus.OPEN },
      include: { course: true, _count: { select: { records: { where: { checkedInAt: { not: null } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      sessionId: s.id,
      course: { id: s.course.id, courseCode: s.course.courseCode, title: s.course.title },
      expiresAt: s.expiresAt,
      checkedInCount: s._count.records,
    }));
  }

  // ---------- Manual / bulk marking (Lecturer) ----------

  async manualMark(sessionId: string, lecturerUserId: string, dto: ManualMarkDto) {
    const session = await this.getSessionOwned(sessionId, lecturerUserId);
    if (session.status === SessionStatus.LOCKED) {
      throw new BadRequestException('This session is locked and can no longer be edited');
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId, studentId: dto.studentId } },
      update: { status: dto.status, comment: dto.comment, markedById: lecturerUserId },
      create: {
        sessionId,
        studentId: dto.studentId,
        status: dto.status,
        comment: dto.comment,
        markedById: lecturerUserId,
      },
    });
    return record;
  }

  async bulkMark(sessionId: string, lecturerUserId: string, records: ManualMarkDto[]) {
    const session = await this.getSessionOwned(sessionId, lecturerUserId);
    if (session.status === SessionStatus.LOCKED) {
      throw new BadRequestException('This session is locked and can no longer be edited');
    }

    const results: AttendanceRecord[] = [];
    for (const r of records) {
      results.push(
        await this.prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
          update: { status: r.status, comment: r.comment, markedById: lecturerUserId },
          create: {
            sessionId,
            studentId: r.studentId,
            status: r.status,
            comment: r.comment,
            markedById: lecturerUserId,
          },
        }),
      );
    }
    return { updated: results.length };
  }

  // ---------- Reads ----------

  async getSessionRoster(sessionId: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      include: {
        course: true,
        records: { include: { student: { include: { user: true } } } },
      },
    });
    if (!session) throw new NotFoundException('Attendance session not found');
    return session;
  }

  getCourseSessions(courseId: string) {
    return this.prisma.attendanceSession.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { sessionDate: 'desc' },
      include: { _count: { select: { records: true } } },
    });
  }

  /** Students may only view their own records; admins and lecturers may view any student's. */
  private async assertStudentAccess(requestingUser: { id: string; role: string } | undefined, studentId: string) {
    if (!requestingUser || requestingUser.role !== 'STUDENT') return;
    const own = await this.prisma.student.findUnique({ where: { userId: requestingUser.id } });
    if (!own || own.id !== studentId) {
      throw new ForbiddenException('You can only view your own attendance data');
    }
  }

  async getStudentHistory(studentId: string, requestingUser?: { id: string; role: string }) {
    await this.assertStudentAccess(requestingUser, studentId);
    return this.prisma.attendanceRecord.findMany({
      where: { studentId, deletedAt: null },
      include: { session: { include: { course: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentCourseStats(studentId: string, courseId: string, requestingUser?: { id: string; role: string }) {
    await this.assertStudentAccess(requestingUser, studentId);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId, deletedAt: null, session: { courseId } },
    });
    const total = records.length;
    const present = records.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
    ).length;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 1000) / 10;
    return { total, present, percentage };
  }

  async getStudentOverallPercentage(studentId: string, requestingUser?: { id: string; role: string }) {
    await this.assertStudentAccess(requestingUser, studentId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, deletedAt: null },
      include: { course: true },
    });
    const perCourse = await Promise.all(
      enrollments.map(async (e) => ({
        course: e.course,
        // Ownership already verified above — skip the redundant per-course check.
        ...(await this.getStudentCourseStats(studentId, e.courseId)),
      })),
    );
    const totalSessions = perCourse.reduce((sum, c) => sum + c.total, 0);
    const totalPresent = perCourse.reduce((sum, c) => sum + c.present, 0);
    const overall = totalSessions === 0 ? 0 : Math.round((totalPresent / totalSessions) * 1000) / 10;
    return { overall, perCourse };
  }

  // ---------- Low attendance monitoring ----------

  private async recalculateAndAlert(courseId: string) {
    const threshold = await this.systemSettings.getNumber('LOW_ATTENDANCE_THRESHOLD');
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId, deletedAt: null },
      include: { student: { include: { user: true } } },
    });

    for (const enrollment of enrollments) {
      const stats = await this.getStudentCourseStats(enrollment.studentId, courseId);
      if (stats.total >= 3 && stats.percentage < threshold) {
        await this.notifications.create(
          enrollment.student.user.id,
          'Low Attendance Alert',
          `Your attendance in this course has dropped to ${stats.percentage}%, below the ${threshold}% requirement.`,
          'low_attendance',
        );
      }
    }
  }
}
