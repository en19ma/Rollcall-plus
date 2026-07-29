import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('admin/overview')
  @Roles(Role.ADMIN)
  adminOverview() {
    return this.service.adminOverview();
  }

  @Get('admin/low-attendance')
  @Roles(Role.ADMIN, Role.LECTURER)
  lowAttendance(@Query('threshold') threshold?: string) {
    return this.service.getLowAttendanceStudents(threshold ? Number(threshold) : undefined);
  }

  @Get('courses/:courseId')
  @Roles(Role.ADMIN, Role.LECTURER)
  courseAnalytics(@Param('courseId') courseId: string) {
    return this.service.courseAnalytics(courseId);
  }

  @Get('lecturers/:lecturerId/dashboard')
  @Roles(Role.ADMIN, Role.LECTURER)
  lecturerDashboard(@Param('lecturerId') lecturerId: string) {
    return this.service.lecturerDashboard(lecturerId);
  }

  @Get('students/:studentId/dashboard')
  studentDashboard(@Param('studentId') studentId: string) {
    return this.service.studentDashboard(studentId);
  }
}
