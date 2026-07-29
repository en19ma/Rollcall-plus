import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async buildCourseReportData(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      include: { lecturer: { include: { user: true } }, department: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId, deletedAt: null },
      include: { student: { include: { user: true } } },
    });

    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const records = await this.prisma.attendanceRecord.findMany({
          where: { studentId: e.studentId, deletedAt: null, session: { courseId } },
        });
        const total = records.length;
        const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
        const percentage = total === 0 ? 0 : Math.round((present / total) * 1000) / 10;
        return {
          studentCode: e.student.studentCode,
          name: e.student.user.name,
          total,
          present,
          absent: total - present,
          percentage,
        };
      }),
    );

    return { course, rows };
  }

  async generateCourseCsv(courseId: string): Promise<StreamableFile> {
    const { course, rows } = await this.buildCourseReportData(courseId);
    const csv = stringify(
      rows.map((r) => ({
        'Student Code': r.studentCode,
        Name: r.name,
        'Total Sessions': r.total,
        Present: r.present,
        Absent: r.absent,
        'Attendance %': r.percentage,
      })),
      { header: true },
    );
    const buffer = Buffer.from(csv, 'utf-8');
    return new StreamableFile(buffer, {
      type: 'text/csv',
      disposition: `attachment; filename="${course.courseCode}-attendance-report.csv"`,
    });
  }

  async generateCoursePdf(courseId: string): Promise<StreamableFile> {
    const { course, rows } = await this.buildCourseReportData(courseId);

    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(18).text(`Attendance Report — ${course.courseCode}: ${course.title}`);
    doc.fontSize(10).fillColor('gray').text(`Semester: ${course.semester}  |  Department: ${course.department.name}`);
    doc.moveDown();

    doc.fillColor('black').fontSize(11);
    const colX = [40, 140, 320, 380, 440, 500];
    const headers = ['Student Code', 'Name', 'Total', 'Present', 'Absent', 'Attendance %'];
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1 }));
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    rows.forEach((r) => {
      const y = doc.y;
      doc.text(r.studentCode, colX[0], y, { width: 95 });
      doc.text(r.name, colX[1], y, { width: 170 });
      doc.text(String(r.total), colX[2], y, { width: 50 });
      doc.text(String(r.present), colX[3], y, { width: 50 });
      doc.text(String(r.absent), colX[4], y, { width: 50 });
      doc.text(`${r.percentage}%`, colX[5], y, { width: 60 });
      doc.moveDown(0.6);
    });

    doc.end();

    const buffer: Buffer = await new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${course.courseCode}-attendance-report.pdf"`,
    });
  }
}
