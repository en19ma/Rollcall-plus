import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemSettingsService } from './system-settings.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

class UpdateSettingDto {
  @ApiProperty()
  @IsString()
  value: string;
}

@ApiTags('system-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('system-settings')
export class SystemSettingsController {
  constructor(
    private service: SystemSettingsService,
    private auditLogs: AuditLogsService,
  ) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Put(':key')
  async update(@CurrentUser() user: any, @Param('key') key: string, @Body() dto: UpdateSettingDto) {
    const updated = await this.service.set(key, dto.value);
    await this.auditLogs.log({
      userId: user.id,
      action: 'SYSTEM_SETTING_UPDATED',
      entity: 'SystemSetting',
      entityId: key,
      metadata: { key, value: dto.value },
    });
    return updated;
  }
}
