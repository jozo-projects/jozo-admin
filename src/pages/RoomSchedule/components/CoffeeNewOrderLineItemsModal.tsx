import {
  ICoffeeSessionOrderDetail,
  ICoffeeSessionOrderLine,
  ICoffeeSessionOrderLineItem,
  ICompactCoffeeSessionOrderBatch,
} from "@/@types/CoffeeSessionOrder";
import { IFnBCustomizationGroupTemplate } from "@/@types/FnBCustomization";
import coffeeSessionOrderApis from "@/apis/coffeeSessionOrder.apis";
import customizationGroupTemplateApis from "@/apis/customizationGroupTemplate.apis";
import fnbMenuApis from "@/apis/fnbMenu.apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FnBMenuItem } from "@/hooks/use-menu-items";
import { useToast } from "@/hooks/use-toast";
import {
  formatSelectionPrice,
  getLineItemSelectionDisplayGroups,
  selectionGroupsToPlainLines,
  type SelectionDisplayGroup,
} from "@/utils/coffeeOrderLineItemSelections";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Printer } from "lucide-react";
import React from "react";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type CoffeeNewOrderLineItemsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tableName?: string;
  coffeeSessionId: string;
  summaryMessage?: string;
  initialLines?: ICoffeeSessionOrderLine[];
  initialLineItems?: ICoffeeSessionOrderLineItem[];
  highlightBatchId?: string;
  initialCreatedBatch?: ICompactCoffeeSessionOrderBatch;
  onOpenSession?: () => void;
};

const categoryLabel = (category: string) => {
  const c = category.toLowerCase();
  if (c === "drink" || c === "drinks") return "Đồ uống";
  if (c === "snack" || c === "snacks") return "Ăn vặt";
  return category;
};

type DisplayRow = {
  key: string;
  name: string;
  quantity: number;
  category: string;
  note?: string | null;
  selectionGroups: SelectionDisplayGroup[];
};

function rowsFromLineItems(
  lineItems: ICoffeeSessionOrderLineItem[],
  menuItems: FnBMenuItem[],
  templates: IFnBCustomizationGroupTemplate[],
): DisplayRow[] {
  return lineItems.map((li) => ({
    key: li.lineId || `${li.itemId}-${li.name}`,
    name: li.name,
    quantity: li.quantity,
    category: li.category,
    note: li.note,
    selectionGroups: getLineItemSelectionDisplayGroups(li, menuItems, templates),
  }));
}

function rowsFromLines(
  lines: ICoffeeSessionOrderLine[],
  menuItems: FnBMenuItem[],
  templates: IFnBCustomizationGroupTemplate[],
): DisplayRow[] {
  return lines.map((line) => ({
    key: line.lineId,
    name: line.itemId,
    quantity: line.quantity,
    category: line.category,
    note: line.note,
    selectionGroups: getLineItemSelectionDisplayGroups(
      { itemId: line.itemId, selections: line.selections },
      menuItems,
      templates,
    ),
  }));
}

const OrderLineItemSelections: React.FC<{
  groups: SelectionDisplayGroup[];
  className?: string;
}> = ({ groups, className }) => {
  if (!groups.length) return null;
  return (
    <div
      className={
        className ??
        "mt-0.5 space-y-0.5 text-xs text-muted-foreground"
      }
    >
      {groups.map((group) => (
        <p key={group.key}>
          <span className="font-medium text-foreground">{group.label}:</span>{" "}
          {group.options
            .map(
              (option) =>
                `${option.label}${formatSelectionPrice(option.priceDelta)}`,
            )
            .join(", ")}
        </p>
      ))}
    </div>
  );
};

function sortPendingBatchesBySubmittedDesc(
  batches: ICompactCoffeeSessionOrderBatch[],
): ICompactCoffeeSessionOrderBatch[] {
  return [...batches].sort(
    (a, b) => dayjs(b.submittedAt).valueOf() - dayjs(a.submittedAt).valueOf(),
  );
}

const CoffeeNewOrderLineItemsModal: React.FC<
  CoffeeNewOrderLineItemsModalProps
> = ({
  isOpen,
  onClose,
  tableName,
  coffeeSessionId,
  summaryMessage,
  initialLines,
  initialLineItems,
  highlightBatchId,
  initialCreatedBatch,
  onOpenSession,
}) => {
  const { toast } = useToast();
  const orderQuery = useQuery({
    queryKey: ["coffeeSessionOrder", coffeeSessionId, "new-order-preview"],
    queryFn: async () => {
      if (!coffeeSessionId) return null;
      const response =
        await coffeeSessionOrderApis.getCoffeeSessionOrder(coffeeSessionId);
      return (response.data.result || null) as ICoffeeSessionOrderDetail | null;
    },
    enabled: isOpen && !!coffeeSessionId,
    refetchOnWindowFocus: false,
  });

  const menuItemsQuery = useQuery({
    queryKey: ["menuItems", "coffee-new-order-modal"],
    queryFn: fnbMenuApis.getAllMenuItems,
    select: (response) => (response.data.result || []) as FnBMenuItem[],
    enabled: isOpen,
  });

  const customizationTemplatesQuery = useQuery({
    queryKey: ["customizationGroupTemplates", "coffee-new-order-modal"],
    queryFn: customizationGroupTemplateApis.getTemplates,
    select: (response) =>
      (response.data.result || []) as IFnBCustomizationGroupTemplate[],
    enabled: isOpen,
  });

  const apiBatches = orderQuery.data?.batches;
  const batchesSource: ICompactCoffeeSessionOrderBatch[] =
    apiBatches && apiBatches.length > 0
      ? apiBatches
      : initialCreatedBatch
        ? [initialCreatedBatch]
        : [];

  /** Chỉ đợt chưa phục vụ — preview bar không hiện batch đã served */
  const pendingBatchesOnly = batchesSource.filter((b) => b.status === "pending");
  const sortedBatches = sortPendingBatchesBySubmittedDesc(pendingBatchesOnly);

  const hasBatchModel =
    (apiBatches != null && apiBatches.length > 0) || !!initialCreatedBatch;

  const apiItems = orderQuery.data?.lineItems;
  const menuItems = menuItemsQuery.data || [];
  const templates = customizationTemplatesQuery.data || [];

  let flatRows: DisplayRow[] = [];
  if (!hasBatchModel) {
    if (apiItems && apiItems.length > 0) {
      flatRows = rowsFromLineItems(apiItems, menuItems, templates);
    } else if (initialLineItems && initialLineItems.length > 0) {
      flatRows = rowsFromLineItems(initialLineItems, menuItems, templates);
    } else if (initialLines && initialLines.length > 0) {
      flatRows = rowsFromLines(initialLines, menuItems, templates);
    }
  }

  const isLoading =
    orderQuery.isPending &&
    sortedBatches.length === 0 &&
    flatRows.length === 0 &&
    !(hasBatchModel && batchesSource.length > 0);

  const showBatches = sortedBatches.length > 0;
  const batchModelButNothingPending =
    hasBatchModel && batchesSource.length > 0 && sortedBatches.length === 0;

  const canPrint =
    !isLoading &&
    !batchModelButNothingPending &&
    (showBatches || flatRows.length > 0);

  const handlePrint = () => {
    if (!canPrint) return;

    const menuItems = menuItemsQuery.data || [];
    const templates = customizationTemplatesQuery.data || [];

    const title = `Món chờ làm — ${tableName || "Bàn"}`;
    const printedAt = dayjs().format("DD/MM/YYYY HH:mm");
    let inner = "";

    if (showBatches) {
      for (const batch of sortedBatches) {
        inner += `<h2 style="font-size:14px;margin:14px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px;">Đợt ${escapeHtml(batch.batchId)}</h2>`;
        inner += `<p style="font-size:12px;color:#555;margin:0 0 8px;">Gửi: ${escapeHtml(dayjs(batch.submittedAt).format("HH:mm DD/MM/YYYY"))}</p>`;
        inner += `<ul style="margin:0 0 12px;padding-left:20px;">`;
        for (const row of batch.lineItems) {
          const selLines = selectionGroupsToPlainLines(
            getLineItemSelectionDisplayGroups(row, menuItems, templates),
          );
          inner += `<li style="margin:6px 0;"><strong>${escapeHtml(row.name)}</strong> × ${row.quantity}`;
          inner += ` <span style="color:#555;">(${escapeHtml(categoryLabel(row.category))})</span>`;
          if (row.note) {
            inner += `<br/><em style="color:#7c2d12;">Ghi chú: ${escapeHtml(String(row.note))}</em>`;
          }
          if (selLines.length) {
            inner += `<br/><span style="font-size:12px;color:#444;">${selLines.map(escapeHtml).join("<br/>")}</span>`;
          }
          inner += `</li>`;
        }
        inner += `</ul>`;
      }
    } else {
      inner += `<ul style="margin:0;padding-left:20px;">`;
      for (const row of flatRows) {
        const selLines = selectionGroupsToPlainLines(row.selectionGroups);
        inner += `<li style="margin:6px 0;"><strong>${escapeHtml(row.name)}</strong> × ${row.quantity}`;
        inner += ` <span style="color:#555;">(${escapeHtml(categoryLabel(row.category))})</span>`;
        if (row.note) {
          inner += `<br/><em style="color:#7c2d12;">Ghi chú: ${escapeHtml(String(row.note))}</em>`;
        }
        if (selLines.length) {
          inner += `<br/><span style="font-size:12px;color:#444;">${selLines.map(escapeHtml).join("<br/>")}</span>`;
        }
        inner += `</li>`;
      }
      inner += `</ul>`;
    }

    const summaryBlock = summaryMessage
      ? `<p style="font-size:13px;color:#333;margin:0 0 12px;">${escapeHtml(summaryMessage)}</p>`
      : "";

    const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:20px;color:#111;}
  h1{font-size:20px;margin:0 0 8px;}
  .meta{color:#666;font-size:12px;margin:0 0 16px;}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">Phiên: ${escapeHtml(coffeeSessionId)} · In: ${escapeHtml(printedAt)}</p>
${summaryBlock}
${inner}
</body></html>`;

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      toast({
        title: "Không mở được cửa sổ in",
        description: "Hãy cho phép popup cho trang này rồi thử lại.",
        variant: "destructive",
      });
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-h-[85vh] sm:max-w-lg">
        <DialogHeader className="space-y-1 p-6 pb-2 pr-12">
          <DialogTitle>New order preview — {tableName || "?"}</DialogTitle>
          <DialogDescription>
            {summaryMessage ? (
              <span>{summaryMessage}</span>
            ) : (
              <span>Details of the order from CoffeeTable.</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6 sm:max-h-[50vh]">
          <div className="space-y-3 pb-4 pr-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Đang tải chi tiết…
              </p>
            ) : batchModelButNothingPending ? (
              <p className="text-sm text-muted-foreground">
                Không còn món chờ phục vụ trong các đợt hiện tại.
              </p>
            ) : showBatches ? (
              sortedBatches.map((batch) => {
                const isHighlight = highlightBatchId === batch.batchId;
                return (
                  <div
                    key={batch.batchId}
                    className={`rounded-lg border bg-muted/30 px-3 py-2 text-sm ${
                      isHighlight ? "ring-2 ring-amber-500 ring-offset-2" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-xs text-muted-foreground">
                          {batch.batchId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Gửi:{" "}
                          {dayjs(batch.submittedAt).format("HH:mm DD/MM/YYYY")}
                        </p>
                      </div>
                      <Badge variant="default">Chờ làm</Badge>
                    </div>
                    <div className="mt-2 space-y-2 border-t pt-2">
                      {batch.lineItems.map((row) => (
                        <div
                          key={row.lineId || row.itemId}
                          className="flex flex-wrap items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium leading-snug">
                              {row.name}
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                × {row.quantity}
                              </span>
                            </p>
                            <OrderLineItemSelections
                              groups={getLineItemSelectionDisplayGroups(
                                row,
                                menuItemsQuery.data || [],
                                customizationTemplatesQuery.data || [],
                              )}
                            />
                            {row.note ? (
                              <p className="mt-0.5 text-xs italic text-amber-800">
                                Ghi chú: {row.note}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {categoryLabel(row.category)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : flatRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có dòng hàng. Thử &quot;Mở phiên&quot; để đồng bộ từ máy
                chủ.
              </p>
            ) : (
              flatRows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium leading-snug pr-2">
                      {row.name}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        × {row.quantity}
                      </span>
                    </p>
                    <Badge variant="secondary" className="shrink-0">
                      {categoryLabel(row.category)}
                    </Badge>
                  </div>
                  <OrderLineItemSelections
                    groups={row.selectionGroups}
                    className="mt-1 space-y-0.5 text-xs text-muted-foreground"
                  />
                  {row.note ? (
                    <p className="mt-1 text-xs italic text-amber-800">
                      Ghi chú: {row.note}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 gap-2 sm:gap-0 border-t bg-background flex-row flex-wrap justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={!canPrint}
            className="mr-auto sm:mr-auto"
          >
            <Printer className="h-4 w-4" aria-hidden />
            In phiếu
          </Button>
          {onOpenSession ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onOpenSession();
                onClose();
              }}
            >
              Mở phiên / chỉnh order
            </Button>
          ) : null}
          <Button type="button" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoffeeNewOrderLineItemsModal;
