import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('courses/:courseId/summary')
  @Roles(Role.ADMIN, Role.LECTURER)
  getSummary(@Param('courseId') courseId: string) {
    return this.service.buildCourseReportData(courseId);
  }

  @Get('courses/:courseId/csv')
  @Roles(Role.ADMIN, Role.LECTURER)
  getCsv(@Param('courseId') courseId: string) {
    return this.service.generateCourseCsv(courseId);
  }

  @Get('courses/:courseId/pdf')
  @Roles(Role.ADMIN, Role.LECTURER)
  getPdf(@Param('courseId') courseId: string) {
    return this.service.generateCoursePdf(courseId);
  }
}
