import React from "react";
import type { BirthdaySelection, MemberBirthday } from "@/utils/memberBirthday";
import { isBirthdaySelectionValid } from "@/utils/memberBirthday";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export interface BirthdayBenefitsProps {
  offer?: MemberBirthday;
  checked: boolean;
  selection: BirthdaySelection;
  busy?: boolean;
  error?: boolean;
  onCheckedChange: (checked: boolean) => void;
  onSelectionChange: (selection: BirthdaySelection) => void;
  onRetry: () => void;
  onOpenBill: (id: string) => void;
}
const reasons = {
  disabled: "Ưu đãi sinh nhật đang tắt",
  member_not_found: "Không tìm thấy thành viên",
  outside_birthday_month:
    "Không trong tháng sinh nhật hoặc chưa có ngày sinh hợp lệ",
  already_used: "Đã sử dụng ưu đãi sinh nhật năm nay",
  no_available_items: "Chưa có đồ uống khả dụng",
};
function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi")
    .trim();
}

function BirthdayGiftPicker({
  offer,
  selection,
  disabled,
  onSelectionChange,
}: Pick<BirthdayBenefitsProps, "offer" | "selection" | "onSelectionChange"> & {
  disabled: boolean;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [draft, setDraft] = React.useState<BirthdaySelection>({ items: [] });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const valid = isBirthdaySelectionValid(offer, draft);
  const count = draft.items.reduce((total, line) => total + line.quantity, 0);
  const filteredItems =
    offer?.items.filter((item) =>
      normalizeSearch(item.name).includes(normalizeSearch(search)),
    ) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          if (disabled) return;
          setDraft({ items: selection.items.map((line) => ({ ...line })) });
          setSearch("");
        }
        setOpen(nextOpen);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className="min-w-0 line-clamp-2 break-words text-sm"
          aria-label="Quà đã chọn"
        >
          {selection.items.length
            ? selection.items
                .map(
                  (line) =>
                    `${offer?.items.find((item) => item.itemId === line.itemId)?.name ?? "Món không còn khả dụng"} × ${line.quantity}`,
                )
                .join(", ")
            : "Chưa chọn quà"}
        </p>
        <DialogTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
          >
            {selection.items.length ? "Đổi quà" : "Chọn quà"}
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent
        className="flex flex-col gap-4 sm:max-w-xl"
        onCloseAutoFocus={() => triggerRef.current?.focus()}
      >
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>Chọn quà sinh nhật</DialogTitle>
          <DialogDescription>
            Chọn đủ {offer?.policy?.itemCount ?? "số"} đồ uống trong số lượng
            tồn kho. Bấm Xác nhận để lưu lựa chọn.
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 items-center gap-2">
          <Input
            type="search"
            aria-label="Tìm đồ uống"
            placeholder="Tìm đồ uống..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
            >
              Xóa tìm kiếm
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto sm:max-h-[45vh]">
          {filteredItems.length === 0 ? (
            <p
              role="status"
              className="py-6 text-center text-sm text-muted-foreground"
            >
              {search
                ? "Không tìm thấy đồ uống phù hợp"
                : "Chưa có đồ uống khả dụng"}
            </p>
          ) : (
            filteredItems.map((item) => (
              <label
                key={item.itemId}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <span className="min-w-0 break-words">
                  {item.name}{" "}
                  <span className="text-muted-foreground">
                    {item.availableQuantity !== null &&
                      `(còn ${item.availableQuantity})`}
                  </span>
                </span>
                <input
                  aria-label={`Số lượng ${item.name}`}
                  type="number"
                  className="h-9 w-20 shrink-0 rounded-md border bg-background px-2"
                  min={0}
                  max={Math.min(
                    offer?.policy?.itemCount ?? 100,
                    item.availableQuantity ?? 100,
                  )}
                  step={1}
                  disabled={disabled}
                  value={
                    draft.items.find((line) => line.itemId === item.itemId)
                      ?.quantity ?? 0
                  }
                  onChange={(event) => {
                    const quantity = Number(event.target.value);
                    setDraft((previous) => ({
                      items: [
                        ...previous.items.filter(
                          (line) => line.itemId !== item.itemId,
                        ),
                        ...(quantity !== 0
                          ? [{ itemId: item.itemId, quantity }]
                          : []),
                      ],
                    }));
                  }}
                />
              </label>
            ))
          )}
        </div>
        <div className="shrink-0 space-y-2 text-sm">
          <p role="status">
            Đã chọn {count}/{offer?.policy?.itemCount ?? "—"} đồ uống
          </p>
          {!valid && (
            <p role="alert" className="text-destructive">
              Chọn đủ {offer?.policy?.itemCount ?? "số"} đồ uống, với số lượng
              nguyên và không vượt tồn kho.
            </p>
          )}
        </div>
        <DialogFooter className="shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={disabled || !valid}
            onClick={() => {
              if (disabled || !valid) return;
              onSelectionChange(draft);
              setOpen(false);
            }}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BirthdayBenefits({
  offer,
  checked,
  selection,
  busy,
  error,
  onCheckedChange,
  onSelectionChange,
  onRetry,
  onOpenBill,
}: BirthdayBenefitsProps): React.ReactElement {
  return (
    <section
      className="space-y-3 rounded-lg border p-3 text-sm"
      aria-label="Ưu đãi sinh nhật"
    >
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={checked}
          disabled={busy || (!checked && (error || !offer?.eligible))}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        Áp dụng ưu đãi sinh nhật
        {offer?.policy &&
          ` — giảm ${offer.policy.discountPercentage}% + ${offer.policy.itemCount} đồ uống`}
      </label>
      <p className="text-xs text-muted-foreground">
        Mỗi năm một lần trong tháng sinh nhật. Không cần đặt trước; ảnh TV /
        trang trí chỉ dành cho khách đặt trước.
      </p>
      {busy && <p role="status">Đang kiểm tra ưu đãi...</p>}
      {error ? (
        <p role="alert">
          Không thể kiểm tra ưu đãi.{" "}
          <button type="button" className="underline" onClick={onRetry}>
            Thử lại
          </button>
        </p>
      ) : offer?.usedBill ? (
        <p>
          Đã sử dụng:{" "}
          {new Date(offer.usedBill.appliedAt).toLocaleDateString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}{" "}
          ·{" "}
          <button
            type="button"
            className="underline"
            onClick={() => onOpenBill(offer.usedBill!.billId)}
          >
            {offer.usedBill.invoiceCode || "Mở hóa đơn"}
          </button>
        </p>
      ) : (
        offer &&
        !offer.eligible && (
          <p>{offer.reason ? reasons[offer.reason] : "Chưa đủ điều kiện"}</p>
        )
      )}
      {checked && (
        <div className="space-y-2">
          <BirthdayGiftPicker
            offer={offer}
            selection={selection}
            disabled={!!(busy || error || !offer?.eligible)}
            onSelectionChange={onSelectionChange}
          />
          {!isBirthdaySelectionValid(offer, selection) && (
            <p role="alert" className="text-destructive">
              Chọn đủ {offer?.policy?.itemCount ?? "số"} đồ uống, trong số lượng
              tồn kho.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Món tặng được thêm riêng với giá 0đ, không thay thế món đã gọi. Lượt
            chỉ được dùng khi lưu hóa đơn thành công.
          </p>
        </div>
      )}
    </section>
  );
}
