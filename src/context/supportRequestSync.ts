import type { SupportRequest } from '@/@types/SupportRequest';

export function mergeSupportSnapshot(
  current: Record<string, SupportRequest>,
  snapshot: SupportRequest[],
  revisions: Record<string, number>,
  snapshotRevision: number,
): Record<string, SupportRequest> {
  const next: Record<string, SupportRequest> = {};
  for (const request of snapshot) {
    if ((revisions[request.requestId] ?? 0) <= snapshotRevision) next[request.requestId] = request;
  }
  for (const [id, request] of Object.entries(current)) {
    if ((revisions[id] ?? 0) > snapshotRevision) next[id] = request;
  }
  return next;
}
