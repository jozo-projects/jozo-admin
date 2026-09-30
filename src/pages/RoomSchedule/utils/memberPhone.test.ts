import { describe, expect, it } from "vitest";
import { isValidMemberEmail, isValidMemberPhone } from "./memberPhone";

describe('member contact validation', () => {
  it('rejects an invalid saved phone before completing a session', () => {
    expect(isValidMemberPhone('123')).toBe(false);
    expect(isValidMemberPhone('0901234567')).toBe(true);
  });

  it('allows an empty optional email but rejects malformed email', () => {
    expect(isValidMemberEmail('')).toBe(true);
    expect(isValidMemberEmail('member@example.com')).toBe(true);
    expect(isValidMemberEmail('member@')).toBe(false);
  });
});
