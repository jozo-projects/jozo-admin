import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

export interface CalendarEvent {
  _id?: string;
  date: string;
  name: string;
  description?: string;
  /** 0.1–20: multiply holiday pay for permanent staff; null/undefined: no multiplier on this holiday */
  salaryMultiplier?: number | null;
}

interface CustomCalendarProps {
  events?: CalendarEvent[];
  onEventAdd?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => void;
}

const DEFAULT_SALARY_MULTIPLIER_SUGGESTION = "1.5";

function parseSalaryMultiplierInput(raw: string): {
  value: number | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null };
  }
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n)) {
    return { value: null, error: "Invalid multiplier" };
  }
  if (n < 0.1 || n > 20) {
    return {
      value: null,
      error: "Multiplier must be between 0.1 and 20 (or leave empty)",
    };
  }
  return { value: n };
}

export function CustomCalendar({
  events = [],
  onEventAdd,
  onEventDelete,
}: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(
    null,
  );
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({});
  const [salaryMultiplierInput, setSalaryMultiplierInput] = useState(
    DEFAULT_SALARY_MULTIPLIER_SUGGESTION,
  );
  const [multiplierError, setMultiplierError] = useState("");

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = currentDate.startOf("month");
    const lastDayOfMonth = currentDate.endOf("month");
    const firstDayOfWeek = firstDayOfMonth.day();
    const daysInMonth = lastDayOfMonth.date();
    const daysInPrevMonth = firstDayOfMonth.subtract(1, "month").daysInMonth();

    const grid = [];
    let dayCount = 1;
    let nextMonthDayCount = 1;

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        if (week === 0 && day < firstDayOfWeek) {
          weekDays.push({
            date: dayjs(currentDate)
              .subtract(1, "month")
              .date(daysInPrevMonth - firstDayOfWeek + day + 1),
            isCurrentMonth: false,
          });
        } else if (dayCount > daysInMonth) {
          weekDays.push({
            date: dayjs(currentDate).add(1, "month").date(nextMonthDayCount),
            isCurrentMonth: false,
          });
          nextMonthDayCount++;
        } else {
          weekDays.push({
            date: dayjs(currentDate).date(dayCount),
            isCurrentMonth: true,
          });
          dayCount++;
        }
      }
      grid.push(weekDays);
    }
    return grid;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, "month"));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const openAddDialogForDate = (date: dayjs.Dayjs) => {
    setSelectedDate(date);
    setNewEvent({ date: date.format("YYYY-MM-DD") });
    setSalaryMultiplierInput(DEFAULT_SALARY_MULTIPLIER_SUGGESTION);
    setMultiplierError("");
    setIsAddEventOpen(true);
  };

  const handleDateClick = (date: dayjs.Dayjs) => {
    openAddDialogForDate(date);
  };

  const handleOpenAddFromHeader = () => {
    const today = dayjs();
    setSelectedDate(today);
    setNewEvent({ date: today.format("YYYY-MM-DD") });
    setSalaryMultiplierInput(DEFAULT_SALARY_MULTIPLIER_SUGGESTION);
    setMultiplierError("");
    setIsAddEventOpen(true);
  };

  const handleAddEvent = () => {
    console.log("newEvent", newEvent);
    if (!newEvent.date || !newEvent.name?.trim()) return;

    const parsed = parseSalaryMultiplierInput(salaryMultiplierInput);
    if (parsed.error) {
      setMultiplierError(parsed.error);
      return;
    }
    setMultiplierError("");

    onEventAdd?.({
      date: newEvent.date,
      name: newEvent.name.trim(),
      description: newEvent.description?.trim() || undefined,
      salaryMultiplier: parsed.value,
    });
    setIsAddEventOpen(false);
    setNewEvent({});
    setSalaryMultiplierInput(DEFAULT_SALARY_MULTIPLIER_SUGGESTION);
  };

  const handleDeleteClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(event);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      onEventDelete?.(eventToDelete);
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const getEventForDate = (date: dayjs.Dayjs) => {
    const eventsArray = Array.isArray(events) ? events : [];

    return eventsArray.find((event) => dayjs(event.date).isSame(date, "day"));
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Today
          </Button>
          <h2 className="text-xl font-semibold">
            {currentDate.format("MMMM YYYY")}
          </h2>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleOpenAddFromHeader}
          aria-label="Add holiday"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[640px] grid-cols-7 gap-px bg-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="bg-muted p-2 text-center font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {calendarGrid.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const event = getEventForDate(day.date);
            const isToday = day.date.isSame(dayjs(), "day");
            const isSelected = selectedDate?.isSame(day.date, "day");

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`relative min-h-[120px] bg-card p-2 ${
                  !day.isCurrentMonth ? "text-muted-foreground" : ""
                } ${isToday ? "bg-primary/5" : ""} ${
                  isSelected ? "ring-2 ring-inset ring-primary" : ""
                }`}
                onClick={() => handleDateClick(day.date)}
              >
                <div className="font-medium">{day.date.date()}</div>
                {event && (
                  <div className="mt-1">
                    <div className="group flex items-center justify-between rounded-md border-l-4 border-destructive bg-destructive/10 p-2 text-xs">
                      <span className="truncate font-medium" title={event.name}>
                        {event.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        aria-label={`Delete ${event.name}`}
                        onClick={(e) => handleDeleteClick(event, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {event.salaryMultiplier != null &&
                      event.salaryMultiplier > 0 && (
                        <p className="text-xs font-medium text-red-700 mt-0.5">
                          Pay multiplier: ×{event.salaryMultiplier}
                        </p>
                      )}
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
      </div>

      <Dialog
        open={isAddEventOpen}
        onOpenChange={(open) => {
          setIsAddEventOpen(open);
          if (!open) {
            setMultiplierError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="holiday-date">Date</Label>
              <Input
                id="holiday-date"
                type="date"
                value={newEvent.date || ""}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="holiday-name">Holiday name *</Label>
              <Input
                id="holiday-name"
                value={newEvent.name || ""}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, name: e.target.value })
                }
                placeholder="e.g. Lunar New Year"
              />
            </div>
            <div>
              <Label htmlFor="holiday-salary-mult">
                Holiday pay multiplier (permanent staff)
              </Label>
              <Input
                id="holiday-salary-mult"
                inputMode="decimal"
                value={salaryMultiplierInput}
                onChange={(e) => {
                  setSalaryMultiplierInput(e.target.value);
                  setMultiplierError("");
                }}
                placeholder={`Suggested: ${DEFAULT_SALARY_MULTIPLIER_SUGGESTION}`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Range 0.1–20. Leave empty for no multiplier on this holiday
                (other rules such as probation may still apply).
              </p>
              {multiplierError && (
                <p className="text-sm text-destructive mt-1">
                  {multiplierError}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="holiday-desc">Description (optional)</Label>
              <Textarea
                id="holiday-desc"
                value={newEvent.description || ""}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                placeholder="Additional notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddEventOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddEvent}>Save holiday</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this holiday? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
