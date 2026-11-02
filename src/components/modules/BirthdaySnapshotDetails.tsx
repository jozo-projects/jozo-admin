import React from "react";
import type { BirthdaySnapshot } from "@/utils/memberBirthday";
export function BirthdaySnapshotDetails({
  birthday,
}: {
  birthday: BirthdaySnapshot;
}): React.ReactElement {
  return (
    <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
      <p className="font-medium">
        Sinh nhật {birthday.year} · Giảm {birthday.discountPercentage}%: −
        {birthday.discountAmount.toLocaleString("vi-VN")}đ
      </p>
      {birthday.items.map((item) => (
        <p key={item.itemId}>
          {item.name} ×{item.quantity} — 0đ (quà sinh nhật)
        </p>
      ))}
    </div>
  );
}
