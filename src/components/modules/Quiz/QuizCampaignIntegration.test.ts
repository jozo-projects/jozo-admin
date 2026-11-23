// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
const transport = vi.hoisted(() => ({ base: '' }));
vi.mock('@/utils/http', () => ({ default: {
  put: async (path: string, body: unknown) => { const r = await fetch(transport.base + path, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(String(r.status)); return { data: await r.json() }; },
  get: async (path: string) => { const r = await fetch(transport.base + path); if (!r.ok) throw new Error(String(r.status)); return { data: await r.json() }; },
} }));
import { QuizCampaignForm } from './QuizCampaignForm';
import type { QuizCampaignDraft } from './quiz-types';
import { quizApis, toCampaign, toDraft } from '@/apis/quiz.apis';
let child: ChildProcess;
beforeAll(async () => {
  child = spawn('./node_modules/.bin/ts-node', ['-r', 'tsconfig-paths/register', 'src/routes/quiz.integration.fixture.ts'], { cwd: '../be-ezinn', stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = ''; child.stderr!.on('data', b => { stderr += b; });
  const info: any = await new Promise((resolve, reject) => { let data = ''; const timer = setTimeout(() => reject(new Error(`fixture timeout ${stderr}`)), 30000); child.once('exit', code => reject(new Error(`fixture exited ${code} ${stderr}`))); child.stdout!.on('data', b => { data += b; const line = data.split('\n').find(s => s.startsWith('{"port"')); if (line) { clearTimeout(timer); resolve(JSON.parse(line)); } }); });
  transport.base = `http://127.0.0.1:${info.port}`;
}, 40000);
afterAll(async () => { if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } }, 15000);
it('submits mounted admin form through its adapter to the real isolated route', async () => {
  const now = Date.now();
  const campaign = { title: 'Ban đầu', description: '', iconUrl: 'https://example.com/a.gif', enabled: true, startsAt: new Date(now - 60000).toISOString(), endsAt: new Date(now + 600000).toISOString(), questionCount: 1, durationSeconds: 60, revealSeconds: 0, questions: [{ text: 'Q', options: ['A', 'B'], correctIndex: 1 }], rewardTiers: [{ minScore: 1, items: [{ menuItemId: '507f1f77bcf86cd799439011', name: 'Trà', quantity: 2 }] }] };
  let saved = false;
  function Wrapper() { const [value, onChange] = useState<QuizCampaignDraft>(() => ({ ...toDraft(campaign), rewards: [{ minimumCorrect: 1, items: [] }] })); return createElement(QuizCampaignForm, { value, onChange, onSave: async d => { await quizApis.saveCampaign(toCampaign(d)); saved = true; } }); }
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['menuItems', 'list'], [{ _id: '507f1f77bcf86cd799439011', name: 'Trà', parentId: null, hasVariant: false, isActive: true }]);
    await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Wrapper))));
    const select = host.querySelector('select[aria-label="Chọn món quà trong danh mục"]') as HTMLSelectElement;
    await act(async () => { select.value = '507f1f77bcf86cd799439011'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    const add = [...host.querySelectorAll('button')].find(b => b.textContent === 'Thêm quà')!;
    await act(async () => add.click());
    const quantity = host.querySelector('input[aria-label="Số lượng quà 1"]') as HTMLInputElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(quantity, '2'); quantity.dispatchEvent(new Event('input', { bubbles: true })); });
    const label = [...host.querySelectorAll('label')].find(x => x.textContent?.includes('Tên chương trình'))!; const input = label.querySelector('input')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Đã lưu'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    for (let i = 0; i < 100 && !saved; i++) await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(saved).toBe(true); expect(await quizApis.getCampaign()).toEqual({ ...campaign, title: 'Đã lưu' });
  } finally { await act(async () => root.unmount()); host.remove(); }
}, 30000);
