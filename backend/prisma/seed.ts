import { PrismaClient, Role, AttendanceStatus, SessionStatus, Student } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // Departments
  const cs = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { name: 'Computer Science', code: 'CS' },
  });
  const eng = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: { name: 'Engineering', code: 'ENG' },
  });

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rollcall.edu' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@rollcall.edu',
      passwordHash: await hash('Admin@12345'),
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  // Lecturer
  const lecturerUser = await prisma.user.upsert({
    where: { email: 'lecturer@rollcall.edu' },
    update: {},
    create: {
      name: 'Dr. Jane Mensah',
      email: 'lecturer@rollcall.edu',
      passwordHash: await hash('Lecturer@12345'),
      role: Role.LECTURER,
      isEmailVerified: true,
    },
  });
  const lecturer = await prisma.lecturer.upsert({
    where: { userId: lecturerUser.id },
    update: {},
    create: {
      userId: lecturerUser.id,
      staffCode: 'LEC-0001',
      departmentId: cs.id,
      designation: 'Senior Lecturer',
    },
  });

  // Course
  const course = await prisma.course.upsert({
    where: { courseCode: 'COE356' },
    update: {},
    create: {
      courseCode: 'COE356',
      title: 'Software Engineering',
      semester: 'Fall 2026',
      creditHours: 3,
      departmentId: cs.id,
      lecturerId: lecturer.id,
    },
  });

  const course2 = await prisma.course.upsert({
    where: { courseCode: 'COE312' },
    update: {},
    create: {
      courseCode: 'COE312',
      title: 'Data Structures',
      semester: 'Fall 2026',
      creditHours: 3,
      departmentId: eng.id,
      lecturerId: lecturer.id,
    },
  });

  // Students
  const studentDefs = [
    { name: 'Kwame Owusu', email: 'student1@rollcall.edu', code: 'STU-0001' },
    { name: 'Ama Boateng', email: 'student2@rollcall.edu', code: 'STU-0002' },
    { name: 'Kojo Asante', email: 'student3@rollcall.edu', code: 'STU-0003' },
  ];

  const students: Student[] = [];
  for (const s of studentDefs) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name,
        email: s.email,
        passwordHash: await hash('Student@12345'),
        role: Role.STUDENT,
        isEmailVerified: true,
      },
    });
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        studentCode: s.code,
        level: 'Level 300',
        programme: 'BSc Computer Engineering',
        departmentId: cs.id,
      },
    });
    students.push(student);

    await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: {},
      create: { studentId: student.id, courseId: course.id },
    });
    await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course2.id } },
      update: {},
      create: { studentId: student.id, courseId: course2.id },
    });
  }

  // A few historical attendance sessions with mixed results
  for (let i = 0; i < 5; i++) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - (5 - i) * 3);

    const session = await prisma.attendanceSession.create({
      data: {
        courseId: course.id,
        createdById: lecturerUser.id,
        lecturerId: lecturer.id,
        qrToken: crypto.randomBytes(16).toString('hex'),
        status: SessionStatus.CLOSED,
        sessionDate,
        expiresAt: new Date(sessionDate.getTime() + 30 * 60000),
        createdAt: sessionDate,
      },
    });

    for (let idx = 0; idx < students.length; idx++) {
      const roll = Math.random();
      const status =
        roll > 0.75 ? AttendanceStatus.ABSENT : roll > 0.6 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: students[idx].id,
          status,
          checkedInAt: status === AttendanceStatus.ABSENT ? null : sessionDate,
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log('Demo accounts:');
  console.log('  Admin:    admin@rollcall.edu / Admin@12345');
  console.log('  Lecturer: lecturer@rollcall.edu / Lecturer@12345');
  console.log('  Students: student1@rollcall.edu, student2@rollcall.edu, student3@rollcall.edu / Student@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
