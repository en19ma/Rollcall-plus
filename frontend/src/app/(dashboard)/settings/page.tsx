'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '' });
  const [edited, setEdited] = useState<Record<string, string>>({});

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => (await api.get('/system-settings')).data,
  });

  const createDept = useMutation({
    mutationFn: async () => api.post('/departments', form),
    onSuccess: () => {
      toast.success('Department added');
      setForm({ name: '', code: '' });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not add department'),
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) =>
      api.put(`/system-settings/${key}`, { value }),
    onSuccess: (_data, variables) => {
      toast.success('Setting updated');
      setEdited((prev) => {
        const next = { ...prev };
        delete next[variables.key];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update setting'),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Departments</h3>
        <p className="mt-1 text-sm text-base-50/60">Manage the academic departments courses and users belong to.</p>

        <div className="mt-4 space-y-2">
          {isLoading && <p className="text-sm text-base-50/50">Loading…</p>}
          {departments?.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] p-3">
              <span className="text-sm font-medium">{d.name}</span>
              <span className="badge bg-white/[0.06] text-base-50/60">{d.code}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <input placeholder="Department name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Code" className="input-field !w-28" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <button className="btn-primary shrink-0" disabled={!form.name || !form.code} onClick={() => createDept.mutate()}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">System settings</h3>
        <p className="mt-1 text-sm text-base-50/60">
          These take effect immediately — no redeploy needed. Values shown in amber haven&apos;t been saved yet.
        </p>

        <div className="mt-4 space-y-4">
          {settingsLoading && <p className="text-sm text-base-50/50">Loading…</p>}
          {settings?.map((s: any) => {
            const currentValue = edited[s.key] ?? s.value;
            const isDirty = edited[s.key] !== undefined && edited[s.key] !== s.value;
            return (
              <div key={s.key} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                <label className="mb-1.5 block text-sm font-medium">
                  {s.key.replaceAll('_', ' ')}
                  {s.isDefault && <span className="ml-2 text-xs font-normal text-base-50/40">(using default)</span>}
                </label>
                <p className="mb-2 text-xs text-base-50/50">{s.description}</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className={`input-field !w-32 ${isDirty ? 'border-amber' : ''}`}
                    value={currentValue}
                    onChange={(e) => setEdited((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  />
                  <button
                    className="btn-secondary text-xs"
                    disabled={!isDirty || updateSetting.isPending}
                    onClick={() => updateSetting.mutate({ key: s.key, value: currentValue })}
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
