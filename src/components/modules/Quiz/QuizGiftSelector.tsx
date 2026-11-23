import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A selectable, orderable catalog record; variant IDs are their own menu item IDs. */
export interface QuizGiftOption { menuItemId: string; label: string }
/** Local UI draft only, not a campaign API payload. */
export interface QuizGiftSelection { menuItemId?: string; name?: string; quantity: number }

export function QuizGiftSelector({ options, value, onChange, disabled = false }: {
  options: QuizGiftOption[];
  value: QuizGiftSelection[];
  onChange: (value: QuizGiftSelection[]) => void;
  disabled?: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  const available = options.filter(option => !value.some(item => item.menuItemId === option.menuItemId));
  const canAdd = available.some(option => option.menuItemId === selectedId);
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Quà được ghi 0đ vào bill khi nhân viên xác nhận trao.</p>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Chọn món quà trong danh mục" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" disabled={disabled || !available.length} value={canAdd ? selectedId : ""} onChange={e => setSelectedId(e.target.value)}>
        <option value="">{available.length ? "Chọn món hoặc phiên bản" : "Không có món để chọn"}</option>
        {available.map(option => <option key={option.menuItemId} value={option.menuItemId}>{option.label}</option>)}
      </select>
      <Button type="button" variant="outline" disabled={disabled || !canAdd} onClick={() => { if (canAdd) { onChange([...value, { menuItemId: selectedId, quantity: 1 }]); setSelectedId(""); } }}>Thêm quà</Button>
    </div>
    {value.map((item, index) => <div key={`${item.menuItemId ?? 'legacy'}-${index}`} className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 flex-1">{options.find(option => option.menuItemId === item.menuItemId)?.label ?? `${item.name || 'Quà cũ'} — không còn trong danh mục (${item.menuItemId || 'thiếu mã món'}), hãy xóa và chọn lại`}</span>
      <Input className="w-24" aria-label={`Số lượng quà ${index + 1}`} type="number" min={1} step={1} disabled={disabled} value={Number.isNaN(item.quantity) ? "" : item.quantity} onChange={e => onChange(value.map((entry, i) => i === index ? { ...entry, quantity: e.target.value === "" ? NaN : Number(e.target.value) } : entry))} />
      <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange(value.filter((_, i) => i !== index))}>Xóa quà</Button>
    </div>)}
  </div>;
}
