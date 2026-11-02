import { describe, expect, it } from "vitest";
import { birthdayDraftForScope, restoreBirthdayDraft, birthdaySelectionPayload } from "./memberBirthday";
const saved = { userId: "member-a", selection: { items: [{ itemId: "tea", quantity: 2 }] } };
describe("persisted birthday schedule selection", () => {
  it("restores chosen quantities on reopen/check-in/checkout without duplicating gift lines", () => {
    const restored = restoreBirthdayDraft("schedule-a", "member-a", saved);
    expect(restored).toEqual({ scope: "schedule-a", checked: true, selection: saved.selection });
    expect(birthdaySelectionPayload(restored.checked, restored.selection)).toEqual({ birthdaySelection: saved.selection });
  });
  it("does not apply another member's draft or an explicitly cleared draft", () => {
    expect(restoreBirthdayDraft("schedule-a", "member-b", saved)).toEqual({ scope: "schedule-a", checked: false, selection: { items: [] } });
    expect(restoreBirthdayDraft("schedule-a", "member-a", null).checked).toBe(false);
    expect(birthdaySelectionPayload(false, saved.selection)).toEqual({});
  });
});
const draft = { scope: "schedule-a:phone-a:member-a", checked: true, selection: { items: [{ itemId: "tea", quantity: 2 }] } };
describe("birthday checkout draft identity safety", () => {
  it("preserves exact chosen quantities only for the same active member and schedule", () => {
    expect(birthdayDraftForScope(draft.scope, true, draft)).toBe(draft);
  });
  it.each(["schedule-b:phone-a:member-a", "schedule-a:phone-b:member-b", "schedule-a::"])("synchronously clears stale selection for scope %s before effects run", scope => {
    expect(birthdayDraftForScope(scope, true, draft)).toEqual({ scope, checked: false, selection: { items: [] } });
  });
  it("clears opt-in when the modal closes even before the reset effect", () => {
    expect(birthdayDraftForScope(draft.scope, false, draft)).toEqual({ scope: draft.scope, checked: false, selection: { items: [] } });
  });
});
