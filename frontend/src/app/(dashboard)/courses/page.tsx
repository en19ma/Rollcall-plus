'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function CoursesPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ courseCode: '', title: '', semester: '', creditHours: 3, departmentId: '', lecturerId: '' });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
    enabled: user?.role === 'LECTURER' || user?.role === 'STUDENT',
  });
  const ownLecturerId = me?.lecturer?.id;
  const ownStudentId = me?.student?.id;

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses-list', search, ownLecturerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (user?.role === 'LECTURER' && ownLecturerId) params.set('lecturerId', ownLecturerId);
      return (await api.get(`/courses?${params.toString()}`)).data;
    },
    enabled: user?.role !== 'LECTURER' || !!ownLecturerId,
  });

  const { data: myEnrollments, refetch: refetchMyEnrollments } = useQuery({
    queryKey: ['my-enrollments', ownStudentId],
    queryFn: async () => (await api.get(`/enrollments/student/${ownStudentId}`)).data,
    enabled: user?.role === 'STUDENT' && !!ownStudentId,
  });
  const enrolledCourseIds = new Set(myEnrollments?.map((e: any) => e.course.id) ?? []);

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data,
    enabled: user?.role === 'ADMIN',
  });

  const { data: lecturers } = useQuery({
    queryKey: ['users', 'LECTURER', 'all'],
    queryFn: async () => (await api.get('/users?role=LECTURER&limit=100')).data,
    enabled: user?.role === 'ADMIN',
  });

  const createCourse = useMutation({
    mutationFn: async () =>
      api.post('/courses', {
        ...form,
        lecturerId: form.lecturerId || undefined,
      }),
    onSuccess: () => {
      toast.success('Course created');
      setShowCreate(false);
      setForm({ courseCode: '', title: '', semester: '', creditHours: 3, departmentId: '', lecturerId: '' });
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not create course'),
  });

  const selfEnroll = useMutation({
    mutationFn: async (courseId: string) => api.post('/enrollments/self', { courseId }),
    onSuccess: () => {
      toast.success('Registered for course');
      refetchMyEnrollments();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not register for course'),
  });

  const selfDrop = useMutation({
    mutationFn: async (courseId: string) => api.delete(`/enrollments/self/${courseId}`),
    onSuccess: () => {
      toast.success('Dropped course');
      refetchMyEnrollments();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not drop course'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          placeholder="Search courses…"
          className="input-field sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {user?.role === 'ADMIN' && (
          <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
            <Plus className="h-4 w-4" /> New course
          </button>
        )}
      </div>

      {showCreate && (
        <div className="glass-panel p-6">
          <h3 className="font-display text-base font-semibold">New course</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input placeholder="Course code (e.g. COE356)" className="input-field" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} />
            <input placeholder="Title" className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Semester (e.g. Fall 2026)" className="input-field" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <input type="number" placeholder="Credit hours" className="input-field" value={form.creditHours} onChange={(e) => setForm({ ...form, creditHours: Number(e.target.value) })} />
            <select className="input-field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Select department</option>
              {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="input-field" value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })}>
              <option value="">Assign lecturer (optional, can set later)</option>
              {lecturers?.data?.filter((l: any) => l.lecturer?.departmentId === course.departmentId)
              .map((l: any) => (
            <option key={l.id} value={l.lecturer?.id}>{l.name}</option>))}
            </select>
          </div>
          <button
            className="btn-primary mt-4"
            onClick={() => createCourse.mutate()}
            disabled={
              createCourse.isPending ||
              !form.courseCode.trim() ||
              !form.title.trim() ||
              !form.semester.trim() ||
              !form.departmentId
            }
          >
            Create course
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-base-50/50">Loading…</p>}
        {courses?.map((c: any) => {
          const isEnrolled = enrolledCourseIds.has(c.id);
          return (
            <Link key={c.id} href={`/courses/${c.id}`} className="glass-panel block min-w-0 p-5 transition hover:border-accent/40">
              <p className="truncate text-xs uppercase tracking-wide text-accent-light">{c.courseCode}</p>
              <p className="mt-1 truncate font-display text-base font-semibold">{c.title}</p>
              <p className="mt-1 truncate text-xs text-base-50/50">{c.semester} · {c.creditHours} credit hours</p>
              {c.lecturer && (
                <p className="mt-2 truncate text-xs text-base-50/60">Taught by {c.lecturer.user.name}</p>
              )}
              {!c.lecturer && (
                <p className="mt-2 text-xs text-amber">No lecturer assigned</p>
              )}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-base-50/40">
                <Users className="h-3.5 w-3.5" /> {c._count?.enrollments ?? 0} enrolled
              </div>
              {user?.role === 'STUDENT' && (
                <button
                  className={isEnrolled ? 'btn-secondary mt-4 w-full text-xs' : 'btn-primary mt-4 w-full text-xs'}
                  disabled={selfEnroll.isPending || selfDrop.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEnrolled) selfDrop.mutate(c.id);
                    else selfEnroll.mutate(c.id);
                  }}
                >
                  {(selfEnroll.isPending || selfDrop.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEnrolled ? 'Drop course' : 'Register for course'}
                </button>
              )}
            </Link>
          );
        })}
        {!isLoading && courses?.length === 0 && <p className="text-sm text-base-50/50">No courses found.</p>}
      </div>
    </div>
  );
}

