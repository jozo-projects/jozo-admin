import type { UsersResponse } from '@/@types/user';

// The endpoint is offset-paginated, not a database snapshot. Reject detectable changes
// rather than silently selecting an incomplete set.
export async function loadAllStaff(getPage: (page: number, limit: number) => Promise<{ data: UsersResponse }>) {
  const limit = 100;
  const recipients: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  let total = -1;
  for (let page = 1; ; page++) {
    const result = (await getPage(page, limit)).data?.result;
    const pagination = result?.pagination;
    const items = result?.items ?? result?.users;
    if (!pagination || !Array.isArray(items) || !Number.isInteger(pagination.total) || pagination.total < 0 || pagination.total > 10000 || pagination.page !== page || pagination.limit !== limit || pagination.total_pages !== Math.ceil(pagination.total / limit) || (total !== -1 && total !== pagination.total) || items.length !== Math.min(limit, Math.max(0, pagination.total - (page - 1) * limit))) throw new Error('Staff list changed or is incomplete');
    total = pagination.total;
    for (const user of items) {
      if (!user._id || user.role !== 'staff' || seen.has(user._id)) throw new Error('Staff list changed or is incomplete');
      seen.add(user._id);
      recipients.push({ id: user._id, name: user.name || user.full_name || 'Không có tên' });
    }
    if (recipients.length === total) return recipients;
  }
}
