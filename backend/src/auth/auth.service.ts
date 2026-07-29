import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private auditLogs: AuditLogsService,
    private systemSettings: SystemSettingsService,
  ) {}

  private async signTokens(userId: string, role: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );
    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(userId: string, refreshToken: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(refreshToken), expiresAt },
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    if (dto.role === 'STUDENT' || dto.role === 'LECTURER') {
      const dept = await this.prisma.department.findFirst({ where: { id: dto.departmentId } });
      if (!dept) throw new BadRequestException('Selected department was not found');
    }

    if (dto.role === 'STUDENT' && dto.studentCode) {
      const existingStudent = await this.prisma.student.findUnique({ where: { studentCode: dto.studentCode } });
      if (existingStudent) throw new ConflictException('That student ID is already registered');
    }
    if (dto.role === 'LECTURER' && dto.staffCode) {
      const existingStaff = await this.prisma.lecturer.findUnique({ where: { staffCode: dto.staffCode } });
      if (existingStaff) throw new ConflictException('That staff ID is already registered');
    }

    const saltRounds = Number(this.config.get('BCRYPT_SALT_ROUNDS')) || 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
    });

    if (dto.role === 'STUDENT') {
      await this.prisma.student.create({
        data: {
          userId: user.id,
          studentCode: dto.studentCode!,
          level: dto.level!,
          programme: dto.programme!,
          departmentId: dto.departmentId,
        },
      });
    } else if (dto.role === 'LECTURER') {
      await this.prisma.lecturer.create({
        data: {
          userId: user.id,
          staffCode: dto.staffCode!,
          departmentId: dto.departmentId,
          designation: 'Lecturer',
        },
      });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hashToken(verifyToken), expiresAt },
    });

    await this.auditLogs.log({ userId: user.id, action: 'REGISTER', entity: 'User', entityId: user.id });

    // In production this token is emailed. For local/dev setup it is returned
    // directly so the flow is testable without an SMTP provider configured.
    return {
      message: 'Registration successful. Please verify your email.',
      userId: user.id,
      devEmailVerificationToken: verifyToken,
    };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);
    return { message: 'Email verified successfully' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) throw new UnauthorizedException('Invalid credentials');

    const lockMinutes = await this.systemSettings.getNumber('ACCOUNT_LOCK_MINUTES');
    const maxAttempts = await this.systemSettings.getNumber('ACCOUNT_LOCK_ATTEMPTS');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account locked due to repeated failed attempts. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1;
      const shouldLock = failedLoginCount >= maxAttempts;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: shouldLock ? 0 : failedLoginCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + lockMinutes * 60 * 1000)
            : user.lockedUntil,
        },
      });
      await this.auditLogs.log({ userId: user.id, action: 'LOGIN_FAILED', entity: 'User', entityId: user.id });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, rememberMe: !!dto.rememberMe },
    });

    const tokens = await this.signTokens(user.id, user.role);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    await this.auditLogs.log({ userId: user.id, action: 'LOGIN_SUCCESS', entity: 'User', entityId: user.id });

    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; role: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    // rotate: revoke the used token, issue a new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const tokens = await this.signTokens(payload.sub, payload.role);
    await this.persistRefreshToken(payload.sub, tokens.refreshToken);
    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken) },
      data: { revoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return a generic success message to avoid leaking which emails exist.
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
    await this.auditLogs.log({ userId: user.id, action: 'PASSWORD_RESET_REQUESTED', entity: 'User', entityId: user.id });

    return {
      message: 'If that email exists, a reset link has been sent.',
      devResetToken: token,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = Number(this.config.get('BCRYPT_SALT_ROUNDS')) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { revoked: true },
      }),
    ]);

    await this.auditLogs.log({ userId: record.userId, action: 'PASSWORD_RESET_COMPLETED', entity: 'User', entityId: record.userId });
    return { message: 'Password reset successful. Please log in again.' };
  }
}
