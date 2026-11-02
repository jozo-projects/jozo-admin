import membershipApis from "@/apis/membership.apis";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  birthdaySelectionPayload,
  birthdayDraftForScope,
  restoreBirthdayDraft,
  type ScheduleBirthdayDraft,
  isBirthdaySelectionValid,
  type BirthdaySelection,
} from "@/utils/memberBirthday";

export const memberBirthdayKeys = {
  all: ["member-birthday"] as const,
  offer: (id: string, at?: string) => ["member-birthday", id, "offer", ...(at ? [at] : [])] as const,
  history: (id: string, page: number) =>
    ["member-birthday", id, "history", page] as const,
};
export function useMemberBirthday(id: string, enabled = true, at?: string) {
  return useQuery({
    queryKey: memberBirthdayKeys.offer(id, at),
    queryFn: () => membershipApis.getMemberBirthday(id, at),
    enabled: enabled && !!id,
    select: (response) => response.data.result,
  });
}
export function useBirthdayCheckout(
  scope: string,
  memberId: string,
  enabled: boolean,
  saved?: ScheduleBirthdayDraft | null,
  at?: string,
) {
  const query = useMemberBirthday(memberId, enabled, at);
  const [draft, setDraft] = useState<{
    scope: string;
    checked: boolean;
    selection: BirthdaySelection;
  }>(() => restoreBirthdayDraft(scope, memberId, saved));
  const current = birthdayDraftForScope(scope, enabled, draft);
  useEffect(() => {
    setDraft(restoreBirthdayDraft(scope, memberId, saved));
  }, [scope, enabled, memberId, saved]);
  const valid = isBirthdaySelectionValid(query.data, current.selection);
  const setChecked = (checked: boolean) =>
    setDraft({ ...current, checked, selection: { items: [] } });
  const setSelection = (selection: BirthdaySelection) =>
    setDraft({ ...current, selection });
  const blocked =
    current.checked && (!valid || query.isFetching || query.isError);
  return {
    ...query,
    checked: current.checked,
    selection: current.selection,
    setChecked,
    setSelection,
    valid,
    blocked,
    payload: birthdaySelectionPayload(current.checked, current.selection),
    scheduleDraft: current.checked ? { userId: memberId, selection: current.selection } : null,
    previewSelection: current.checked && valid ? current.selection : undefined,
  };
}
export function useMemberBirthdayHistory(id: string, page: number) {
  return useQuery({
    queryKey: memberBirthdayKeys.history(id, page),
    queryFn: () => membershipApis.getMemberBirthdayHistory(id, page),
    enabled: !!id,
    select: (response) => response.data.result,
  });
}
