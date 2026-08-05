import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { BulkMarkDto, CheckInBySessionDto, CheckInDto, ManualMarkDto } from './dto/mark-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private service: AttendanceService,
    private config: ConfigService,
  ) {}

  @Post('sessions')
  @Roles(Role.LECTURER)
  createSession(@CurrentUser() user: any, @Body() dto: CreateSessionDto) {
    return this.service.createSession(user.id, dto);
  }

  @Get('sessions/:id/qr')
  @Roles(Role.LECTURER)
  async getQr(@CurrentUser() user: any, @Param('id') id: string) {
    const payload = await this.service.getQrPayload(id, user.id);
    // Encode a real link, not a bare token — scanning with any camera app should
    // take the student straight to a check-in page (via login if needed), not
    // show them meaningless text.
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const checkInUrl = `${frontendUrl.replace(/\/$/, '')}/checkin/${payload.qrToken}`;
    const qrImageDataUrl = await QRCode.toDataURL(checkInUrl);
    return { ...payload, checkInUrl, qrImageDataUrl };
  }

  @Get('sessions/:id/roster')
  @Roles(Role.LECTURER, Role.ADMIN)
  getRoster(@Param('id') id: string) {
    return this.service.getSessionRoster(id);
  }

  @Get('courses/:courseId/sessions')
  getCourseSessions(@Param('courseId') courseId: string) {
    return this.service.getCourseSessions(courseId);
  }

  @Get('lecturer/open-sessions')
  @Roles(Role.LECTURER)
  getLecturerOpenSessions(@CurrentUser() user: any) {
    return this.service.getOpenSessionsForLecturer(user.id);
  }

  @Get('my/open-sessions')
  @Roles(Role.STUDENT)
  getMyOpenSessions(@CurrentUser() user: any) {
    return this.service.getOpenSessionsForStudent(user.id);
  }

  @Patch('sessions/:id/close')
  @Roles(Role.LECTURER)
  closeSession(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.closeSession(id, user.id);
  }

  @Patch('sessions/:id/lock')
  @Roles(Role.LECTURER)
  lockSession(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.lockSession(id, user.id);
  }

  @Post('check-in')
  @Roles(Role.STUDENT)
  checkIn(@CurrentUser() user: any, @Body() dto: CheckInDto) {
    return this.service.checkIn(user.id, dto);
  }

  @Post('check-in-session')
  @Roles(Role.STUDENT)
  checkInBySession(@CurrentUser() user: any, @Body() dto: CheckInBySessionDto) {
    return this.service.checkInBySession(user.id, dto);
  }

  @Patch('sessions/:id/mark')
  @Roles(Role.LECTURER)
  manualMark(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ManualMarkDto) {
    return this.service.manualMark(id, user.id, dto);
  }

  @Patch('sessions/:id/bulk-mark')
  @Roles(Role.LECTURER)
  bulkMark(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: BulkMarkDto) {
    return this.service.bulkMark(id, user.id, dto.records);
  }

  @Get('students/:studentId/history')
  getStudentHistory(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getStudentHistory(studentId, user);
  }

  @Get('students/:studentId/summary')
  getStudentSummary(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getStudentOverallPercentage(studentId, user);
  }

  @Get('students/:studentId/courses/:courseId/stats')
  getStudentCourseStats(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.service.getStudentCourseStats(studentId, courseId, user);
  }
}
