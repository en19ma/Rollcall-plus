'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { api } from '@/lib/api';

export default function AuditLogPage() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);

  const { data: filters } = useQuery({
    queryKey: ['audit-log-filters'],
    queryFn: async () => (await api.get('/audit-logs/filters')).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', action, entity, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (entity) params.set('entity', entity);
      params.set('page', String(page));
      params.set('limit', '25');
      return (await api.get(`/audit-logs?${params.toString()}`)).data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-accent-light" />
        <h2 className="font-display text-xl font-semibold">Audit Log</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          className="input-field sm:max-w-xs"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {filters?.actions?.map((a: string) => (
            <option key={a} value={a}>{a.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <select
          className="input-field sm:max-w-xs"
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All entities</option>
          {filters?.entities?.map((e: string) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="glass-panel overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wide text-base-50/50">
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">Actor</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((log: any) => (
              <tr key={log.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3 text-base-50/60">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-5 py-3">{log.user ? `${log.user.name} (${log.user.role.toLowerCase()})` : 'System'}</td>
                <td className="px-5 py-3 font-medium">{log.action.replaceAll('_', ' ')}</td>
                <td className="px-5 py-3 text-base-50/60">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <p className="p-5 text-sm text-base-50/50">Loading…</p>}
        {!isLoading && data?.data?.length === 0 && <p className="p-5 text-sm text-base-50/50">No matching activity yet.</p>}
      </div>

      {data?.meta && data.meta.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-base-50/50">
            Page {data.meta.page} of {data.meta.pageCount} · {data.meta.total} total events
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button
              className="btn-secondary text-xs"
              disabled={page >= data.meta.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
