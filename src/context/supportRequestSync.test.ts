import { describe, expect, it } from 'vitest';
import { mergeSupportSnapshot } from './supportRequestSync';
import type { SupportRequest } from '@/@types/SupportRequest';

const request = (requestId: string, status: string) => ({ requestId, roomId: '101', status }) as SupportRequest;

describe('support snapshot reconciliation', () => {
  it('keeps newer socket changes and does not resurrect resolved requests', () => {
    const result = mergeSupportSnapshot(
      { new: request('new', 'pending'), updated: request('updated', 'acknowledged') },
      [request('closed', 'pending'), request('updated', 'pending'), request('untouched', 'pending')],
      { closed: 2, updated: 3, new: 4 }, 1,
    );
    expect(Object.keys(result).sort()).toEqual(['new', 'untouched', 'updated']);
    expect(result.updated.status).toBe('acknowledged');
  });
  it('removes old local records absent from the snapshot after reconnect', () => {
    expect(mergeSupportSnapshot({ old: request('old', 'pending') }, [], {}, 0)).toEqual({});
  });
});
