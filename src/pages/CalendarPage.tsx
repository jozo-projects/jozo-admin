import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import holidayApis, { Holiday } from "@/apis/holiday.apis";
import { Spin } from "@/components/ui/spin";
import { Calendar as CalendarIcon } from "lucide-react";

function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch holidays
  const { data: holidays, isLoading } = useQuery({
    queryKey: ["holidays"],
    queryFn: holidayApis.getHolidays,
  });

  const events = holidays?.result;

  // Add holiday
  const addHolidayMutation = useMutation({
    mutationFn: holidayApis.addHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({
        title: "Success",
        description: "Holiday added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add holiday",
        variant: "destructive",
      });
    },
  });

  // Delete holiday
  const deleteHolidayMutation = useMutation({
    mutationFn: holidayApis.deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({
        title: "Success",
        description: "Holiday deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete holiday",
        variant: "destructive",
      });
    },
  });

  const handleAddEvent = (event: Holiday) => {
    addHolidayMutation.mutate(event);
  };

  const handleDeleteEvent = (event: Holiday) => {
    if (event._id) {
      deleteHolidayMutation.mutate(event._id);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Holiday Calendar"
        description="Manage public holidays and special dates"
        icon={CalendarIcon}
      />
      <Spin spinning={isLoading}>
        <Card>
          <CardContent>
            <CustomCalendar
              events={events}
              onEventAdd={handleAddEvent}
              onEventDelete={handleDeleteEvent}
            />
          </CardContent>
        </Card>
      </Spin>
    </div>
  );
}

export default CalendarPage;
