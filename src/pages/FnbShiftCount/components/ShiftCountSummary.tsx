import type { IFnbShiftCountSummary } from "@/apis/fnbShiftCount.apis";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { formatVariance } from "../utils";

interface ShiftCountSummaryProps {
  summary?: IFnbShiftCountSummary;
  isAdmin: boolean;
}

const ShiftCountSummary = ({ summary, isAdmin }: ShiftCountSummaryProps) => {
  const [open, setOpen] = useState(false);

  if (!isAdmin || !summary) return null;

  const hasShortage = summary.shortageCount > 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => hasShortage && setOpen(true)}
        disabled={!hasShortage}
        className={
          hasShortage
            ? "gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
            : "gap-2 text-muted-foreground"
        }
      >
        {hasShortage ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        )}
        Món hụt: <span className="font-semibold">{summary.shortageCount}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Món hụt tồn ({summary.shortageCount})
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {summary.shortageItems.map((item) => (
              <li
                key={item.itemId}
                className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate">{item.itemName}</span>
                <span className="shrink-0 font-semibold text-destructive">
                  {formatVariance(item.variance)}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShiftCountSummary;
