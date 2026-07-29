'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STUDENT', departmentId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['users', 'STUDENT', search],
    queryFn: async () => (await api.get(`/users?role=STUDENT${search ? `&search=${search}` : ''}`)).data,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data,
  });

  const createStudent = useMutation({
    mutationFn: async () => api.post('/users', form),
    onSuccess: () => {
      toast.success('Student added');
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'STUDENT', departmentId: '' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not add student'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-50/40" />
          <input placeholder="Search students…" className="input-field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" /> Add student
        </button>
      </div>

      {showCreate && (
        <div className="glass-panel p-6">
          <h3 className="font-display text-base font-semibold">New student</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input placeholder="Full name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Temporary password" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className="input-field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Select department</option>
              {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button
            className="btn-primary mt-4"
            disabled={
              createStudent.isPending ||
              !form.name.trim() ||
              !form.email.trim() ||
              !form.password.trim() ||
              !form.departmentId
            }
            onClick={() => createStudent.mutate()}
          >
            Create student
          </button>
        </div>
      )}

      <div className="glass-panel overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-base-50/50">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Student ID</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Verified</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((u: any) => (
              <tr key={u.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3 font-medium">{u.name}</td>
                <td className="px-5 py-3 text-base-50/60">{u.email}</td>
                <td className="px-5 py-3">{u.student?.studentCode ?? '—'}</td>
                <td className="px-5 py-3">{u.student?.department?.name ?? '—'}</td>
                <td className="px-5 py-3">{u.isEmailVerified ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && data?.data?.length === 0 && <p className="p-5 text-sm text-base-50/50">No students found.</p>}
      </div>
    </div>
  );
}
