import { expect, it, vi } from 'vitest';
import { loadAllStaff } from './select-all-staff';

const item = (id: number) => ({ _id: String(id), name: `Staff ${id}`, role: 'staff', phone_number: '', date_of_birth: '', created_at: '', updated_at: '' });
const response = (page: number, total: number, items: ReturnType<typeof item>[]) => ({ data: { message: '', result: { items, pagination: { page, limit: 100, total, total_pages: Math.ceil(total / 100) } } } });
it('loads every unfiltered page and returns all unique staff', async () => {
  const get = vi.fn().mockResolvedValueOnce(response(1, 101, Array.from({length: 100}, (_, i) => item(i)))).mockResolvedValueOnce(response(2, 101, [item(100)]));
  expect(await loadAllStaff(get)).toHaveLength(101);
  expect(get).toHaveBeenCalledWith(2, 100);
});
it('returns an empty selection for no staff', async () => { expect(await loadAllStaff(async () => response(1, 0, []))).toEqual([]); });
it('rejects failed or inconsistent pages rather than returning a partial selection', async () => {
  const get = vi.fn().mockResolvedValueOnce(response(1, 101, Array.from({length: 100}, (_, i) => item(i)))).mockRejectedValueOnce(new Error('offline'));
  await expect(loadAllStaff(get)).rejects.toThrow();
  const duplicate = vi.fn().mockResolvedValueOnce(response(1, 101, Array.from({length: 100}, (_, i) => item(i)))).mockResolvedValueOnce(response(2, 101, [item(0)]));
  await expect(loadAllStaff(duplicate)).rejects.toThrow();
  const changed = vi.fn().mockResolvedValueOnce(response(1, 101, Array.from({length: 100}, (_, i) => item(i)))).mockResolvedValueOnce(response(2, 102, [item(100), item(101)]));
  await expect(loadAllStaff(changed)).rejects.toThrow();
});
