import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private systemSettings: SystemSettingsService,
  ) {}

  async adminOverview() {
    const [totalStudents, totalLecturers, totalCourses, sessions] = await Promise.all([
      this.prisma.student.count({ where: { deletedAt: null } }),
      this.prisma.lecturer.count({ where: { deletedAt: null } }),
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.attendanceSession.count({ where: { deletedAt: null } }),
    ]);

    const records = await this.prisma.attendanceRecord.findMany({ where: { deletedAt: null } });
    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const attendanceRate = total === 0 ? 0 : Math.round((present / total) * 1000) / 10;

    const recentActivity = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: { select: { name: true, role: true } } },
    });

    const lowAttendance = await this.getLowAttendanceStudents();

    return {
      totalStudents,
      totalLecturers,
      totalCourses,
      totalSessions: sessions,
      attendanceRate,
      recentActivity,
      lowAttendanceCount: lowAttendance.length,
    };
  }

  async getLowAttendanceStudents(threshold?: number) {
    const effectiveThreshold = threshold ?? (await this.systemSettings.getNumber('LOW_ATTENDANCE_THRESHOLD'));
    const students = await this.prisma.student.findMany({
      where: { deletedAt: null },
      include: { user: true, enrollments: { where: { deletedAt: null }, include: { course: true } } },
    });

    const flagged: Array<{ studentId: string; studentCode: string; name: string; percentage: number }> = [];
    for (const student of students) {
      const records = await this.prisma.attendanceRecord.findMany({
        where: { studentId: student.id, deletedAt: null },
      });
      const total = records.length;
      if (total < 3) continue;
      const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const percentage = Math.round((present / total) * 1000) / 10;
      if (percentage < effectiveThreshold) {
        flagged.push({
          studentId: student.id,
          studentCode: student.studentCode,
          name: student.user.name,
          percentage,
        });
      }
    }
    return flagged;
  }

  async courseAnalytics(courseId: string) {
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { courseId, deletedAt: null },
      include: { records: true },
      orderBy: { sessionDate: 'asc' },
    });

    const trend = sessions.map((s) => {
      const total = s.records.length;
      const present = s.records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      return {
        sessionId: s.id,
        date: s.sessionDate,
        attendanceRate: total === 0 ? 0 : Math.round((present / total) * 1000) / 10,
      };
    });

    return { courseId, sessionCount: sessions.length, trend };
  }

  /** A lecturer may only view their own dashboard; admins may view any. */
  private async assertLecturerAccess(requestingUser: { id: string; role: string } | undefined, lecturerId: string) {
    if (!requestingUser || requestingUser.role !== 'LECTURER') return;
    const own = await this.prisma.lecturer.findUnique({ where: { userId: requestingUser.id } });
    if (!own || own.id !== lecturerId) {
      throw new ForbiddenException('You can only view your own dashboard');
    }
  }

  /** A student may only view their own dashboard; admins and lecturers may view any. */
  private async assertStudentAccess(requestingUser: { id: string; role: string } | undefined, studentId: string) {
    if (!requestingUser || requestingUser.role !== 'STUDENT') return;
    const own = await this.prisma.student.findUnique({ where: { userId: requestingUser.id } });
    if (!own || own.id !== studentId) {
      throw new ForbiddenException('You can only view your own dashboard');
    }
  }

  async lecturerDashboard(lecturerId: string, requestingUser?: { id: string; role: string }) {
    await this.assertLecturerAccess(requestingUser, lecturerId);

    const courses = await this.prisma.course.findMany({
      where: { lecturerId, deletedAt: null },
      include: { _count: { select: { enrollments: true } } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysSessions = await this.prisma.attendanceSession.findMany({
      where: {
        lecturerId,
        deletedAt: null,
        sessionDate: { gte: today, lt: tomorrow },
      },
      include: { course: true },
    });

    return { courses, todaysSessions };
  }

  async studentDashboard(studentId: string, requestingUser?: { id: string; role: string }) {
    await this.assertStudentAccess(requestingUser, studentId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, deletedAt: null },
      include: { course: { include: { lecturer: { include: { user: true } } } } },
    });

    const notifications = await this.prisma.notification.findMany({
      where: { user: { student: { id: studentId } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { enrollments, notifications };
  }
}
