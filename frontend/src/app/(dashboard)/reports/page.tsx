'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [courseId, setCourseId] = useState('');

  const { data: courses } = useQuery({
    queryKey: ['courses-for-reports'],
    queryFn: async () => (await api.get('/courses')).data,
  });

  const { data: summary } = useQuery({
    queryKey: ['report-summary', courseId],
    queryFn: async () => (await api.get(`/reports/courses/${courseId}/summary`)).data,
    enabled: !!courseId,
  });

  const download = async (type: 'pdf' | 'csv') => {
    const res = await api.get(`/reports/courses/${courseId}/${type}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-report.${type}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Generate a course report</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <select className="input-field flex-1" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select a course</option>
            {courses?.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>)}
          </select>
          <button className="btn-secondary" disabled={!courseId} onClick={() => download('pdf')}>
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button className="btn-secondary" disabled={!courseId} onClick={() => download('csv')}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {summary && (
        <div className="glass-panel overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-base-50/50">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Sessions</th>
                <th className="px-5 py-3">Present</th>
                <th className="px-5 py-3">Absent</th>
                <th className="px-5 py-3">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r: any) => (
                <tr key={r.studentCode} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-5 py-3">{r.name}</td>
                  <td className="px-5 py-3 text-base-50/60">{r.studentCode}</td>
                  <td className="px-5 py-3">{r.total}</td>
                  <td className="px-5 py-3">{r.present}</td>
                  <td className="px-5 py-3">{r.absent}</td>
                  <td className="px-5 py-3 font-medium">{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary.rows.length === 0 && (
            <p className="p-5 text-sm text-base-50/50">No enrollment or attendance data for this course yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
