import { IBillMembership } from "@/@types/Bill";
import { formatRunningStreak } from "@/pages/RoomSchedule/utils/streakCycle";

const BillMemberSummary = ({
  membership,
}: {
  membership?: IBillMembership | null;
}) => {
  if (!membership) return null;

  const name = membership.full_name?.trim() || membership.name?.trim();
  const phone = membership.phone_number || membership.phone;
  const points = membership.availablePoint ?? membership.points;
  const streakCount = membership.streak?.count ?? membership.streakCount;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t p-3 sm:grid-cols-4">
      <div className="col-span-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:col-span-4">
        Thành viên
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground">Tên</span>
        <span className="break-words font-medium">{name || "—"}</span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground">Số điện thoại</span>
        <span className="break-words font-medium">{phone || "—"}</span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground">Hạng</span>
        <span className="break-words font-medium">{membership.tier || "—"}</span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground">Điểm</span>
        <span className="break-words font-medium">
          {typeof points === "number" ? points.toLocaleString("vi-VN") : "—"}
        </span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground">Streak</span>
        <span className="break-words font-medium">
          {typeof streakCount === "number"
            ? formatRunningStreak(streakCount, membership.streak?.cycle)
            : "—"}
        </span>
      </div>
    </div>
  );
};

export default BillMemberSummary;
