'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, X, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => (await api.get(`/courses/${id}`)).data,
  });

  const { data: enrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ['course-students', id],
    queryFn: async () => (await api.get(`/courses/${id}/students`)).data,
    enabled: isAdmin || user?.role === 'LECTURER',
  });

  const { data: lecturers } = useQuery({
    queryKey: ['users', 'LECTURER', 'all'],
    queryFn: async () => (await api.get('/users?role=LECTURER&limit=100')).data,
    enabled: isAdmin,
  });

  const { data: allStudents } = useQuery({
    queryKey: ['users', 'STUDENT', 'all'],
    queryFn: async () => (await api.get('/users?role=STUDENT&limit=200')).data,
    enabled: isAdmin,
  });

  const assignLecturer = useMutation({
    mutationFn: async () => api.patch(`/courses/${id}/assign-lecturer`, { lecturerId: selectedLecturerId }),
    onSuccess: () => {
      toast.success('Lecturer assigned');
      setSelectedLecturerId('');
      queryClient.invalidateQueries({ queryKey: ['course', id] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not assign lecturer'),
  });

  const enrollStudent = useMutation({
    mutationFn: async () => api.post('/enrollments', { studentId: selectedStudentId, courseId: id }),
    onSuccess: () => {
      toast.success('Student enrolled');
      setSelectedStudentId('');
      refetchEnrollments();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not enroll student'),
  });

  const removeEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) => api.delete(`/enrollments/${enrollmentId}`),
    onSuccess: () => {
      toast.success('Student removed from course');
      refetchEnrollments();
    },
  });

  if (isLoading || !course) return <p className="text-sm text-base-50/50">Loading…</p>;

  const enrolledStudentIds = new Set(enrollments?.map((e: any) => e.student.id) ?? []);
  const availableStudents = allStudents?.data?.filter((u: any) => u.student && !enrolledStudentIds.has(u.student.id)) ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.push('/courses')} className="flex items-center gap-1.5 text-sm text-base-50/60 hover:text-base-50">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </button>

      <div className="glass-panel p-6">
        <p className="text-xs uppercase tracking-wide text-accent-light">{course.courseCode}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{course.title}</h1>
        <p className="mt-1 text-sm text-base-50/60">{course.semester} · {course.creditHours} credit hours · {course.department?.name}</p>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <GraduationCap className="h-4 w-4 text-base-50/50" />
          {course.lecturer ? (
            <span>Taught by <span className="font-medium">{course.lecturer.user.name}</span></span>
          ) : (
            <span className="text-amber">No lecturer assigned yet</span>
          )}
        </div>

        {isAdmin && (
          <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row">
            <select className="input-field flex-1" value={selectedLecturerId} onChange={(e) => setSelectedLecturerId(e.target.value)}>
              <option value="">{course.lecturer ? 'Change lecturer…' : 'Assign a lecturer…'}</option>
              {lecturers?.data?.map((l: any) => (
                <option key={l.id} value={l.lecturer?.id}>{l.name}</option>
              ))}
            </select>
            <button
              className="btn-secondary"
              disabled={!selectedLecturerId || assignLecturer.isPending}
              onClick={() => assignLecturer.mutate()}
            >
              Save
            </button>
          </div>
        )}
      </div>

      {(isAdmin || user?.role === 'LECTURER') && (
        <div className="glass-panel p-6">
          <h3 className="font-display text-base font-semibold">Enrolled students ({enrollments?.length ?? 0})</h3>

          {isAdmin && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select className="input-field flex-1" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">Select a student to enroll…</option>
                {availableStudents.map((u: any) => (
                  <option key={u.id} value={u.student.id}>{u.name} — {u.student.studentCode}</option>
                ))}
              </select>
              <button
                className="btn-primary"
                disabled={!selectedStudentId || enrollStudent.isPending}
                onClick={() => enrollStudent.mutate()}
              >
                <UserPlus className="h-4 w-4" /> Enroll
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {enrollments?.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.student.user.name}</p>
                  <p className="text-xs text-base-50/50">{e.student.studentCode}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => removeEnrollment.mutate(e.id)} className="shrink-0 text-base-50/40 hover:text-rose" aria-label="Remove student">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {enrollments?.length === 0 && (
              <p className="text-sm text-base-50/50">
                No students enrolled yet{isAdmin ? ' — enroll some above so attendance sessions have a roster.' : '.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
