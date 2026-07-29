'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    role: z.enum(['STUDENT', 'LECTURER']),
    departmentId: z.string().optional(),
    studentCode: z.string().optional(),
    programme: z.string().optional(),
    level: z.string().optional(),
    staffCode: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.departmentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['departmentId'], message: 'Select a department' });
    }
    if (data.role === 'STUDENT') {
      if (!data.studentCode) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['studentCode'], message: 'Enter your student ID' });
      if (!data.programme) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['programme'], message: 'Enter your programme' });
      if (!data.level) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['level'], message: 'Select your level' });
    }
    if (data.role === 'LECTURER' && !data.staffCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['staffCode'], message: 'Enter your staff ID' });
    }
  });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'STUDENT' } });

  const role = watch('role');

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data)).catch(() => setDepartments([]));
  }, []);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await api.post('/auth/register', values);
      toast.success('Account created. Check your email to verify, then sign in.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-base-50/60">Join RollCall+ as a student or lecturer.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">I am a</label>
          <select className="input-field" {...register('role')}>
            <option value="STUDENT">Student</option>
            <option value="LECTURER">Lecturer</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Full name</label>
          <input placeholder="Ama Boateng" className="input-field" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-rose">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input type="email" placeholder="you@university.edu" className="input-field" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-rose">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <input type="password" placeholder="At least 8 characters" className="input-field" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-rose">{errors.password.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Department</label>
          <select className="input-field" {...register('departmentId')}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors.departmentId && <p className="mt-1 text-xs text-rose">{errors.departmentId.message}</p>}
        </div>

        {role === 'STUDENT' && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Student ID</label>
              <input placeholder="e.g. STU-2026-0142" className="input-field" {...register('studentCode')} />
              {errors.studentCode && <p className="mt-1 text-xs text-rose">{errors.studentCode.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Programme</label>
              <input placeholder="e.g. BSc Computer Engineering" className="input-field" {...register('programme')} />
              {errors.programme && <p className="mt-1 text-xs text-rose">{errors.programme.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Level</label>
              <select className="input-field" {...register('level')}>
                <option value="">Select level</option>
                <option value="Level 100">Level 100</option>
                <option value="Level 200">Level 200</option>
                <option value="Level 300">Level 300</option>
                <option value="Level 400">Level 400</option>
                <option value="Level 500">Level 500</option>
              </select>
              {errors.level && <p className="mt-1 text-xs text-rose">{errors.level.message}</p>}
            </div>
          </>
        )}

        {role === 'LECTURER' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Staff ID</label>
            <input placeholder="e.g. LEC-2026-0031" className="input-field" {...register('staffCode')} />
            {errors.staffCode && <p className="mt-1 text-xs text-rose">{errors.staffCode.message}</p>}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-50/60">
        Already have an account?{' '}
        <Link href="/login" className="text-accent-light hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
