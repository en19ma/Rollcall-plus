import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Defaults mirror backend/.env.example. A setting not yet present in the
// database falls back to these values rather than throwing, so the app
// works correctly even before an admin has touched the settings screen.
const DEFAULTS: Record<string, string> = {
  LOW_ATTENDANCE_THRESHOLD: '75',
  ACCOUNT_LOCK_ATTEMPTS: '5',
  ACCOUNT_LOCK_MINUTES: '15',
};

export const SETTING_DESCRIPTIONS: Record<string, string> = {
  LOW_ATTENDANCE_THRESHOLD: 'Attendance percentage below which a student is flagged and notified',
  ACCOUNT_LOCK_ATTEMPTS: 'Failed login attempts before an account is temporarily locked',
  ACCOUNT_LOCK_MINUTES: 'How long an account stays locked after too many failed attempts',
};

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const stored = await this.prisma.systemSetting.findMany();
    const storedMap = new Map(stored.map((s) => [s.key, s]));

    return Object.keys(DEFAULTS).map((key) => ({
      key,
      value: storedMap.get(key)?.value ?? DEFAULTS[key],
      description: SETTING_DESCRIPTIONS[key],
      isDefault: !storedMap.has(key),
      updatedAt: storedMap.get(key)?.updatedAt ?? null,
    }));
  }

  async getString(key: string): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? DEFAULTS[key];
  }

  async getNumber(key: string): Promise<number> {
    const value = await this.getString(key);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number(DEFAULTS[key]);
  }

  async set(key: string, value: string) {
    if (!(key in DEFAULTS)) {
      throw new Error(`Unknown setting key: ${key}`);
    }
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
