import { Page, PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import holidayApis, { Holiday } from "@/apis/holiday.apis";
import { Spin } from "@/components/ui/spin";
import { Settings2 } from "lucide-react";
import { RevenueSettingsForm } from "@/components/modules/RevenueSettingsForm";
import OnlineGameBookingConfig from "@/pages/RoomDeviceConnections/OnlineGameBookingConfig";
import DeviceAuthorizationConfig from "@/pages/RoomDeviceConnections/DeviceAuthorizationConfig";
import TvReleaseConfig from "@/pages/RoomDeviceConnections/TvReleaseConfig";

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
    <Page>
      <PageHeader
        title="Cài đặt chung"
        description="Quản lý các cài đặt chung của Jozo"
        icon={Settings2}
      />
      <OnlineGameBookingConfig />
      <DeviceAuthorizationConfig />
      <TvReleaseConfig />
      <Card className="mb-4"><CardContent className="p-3 sm:p-6 space-y-3"><h2 className="font-semibold">Kỳ doanh thu</h2><RevenueSettingsForm /></CardContent></Card>
      <h2 className="mb-3 font-semibold">Ngày lễ</h2>
      <Spin spinning={isLoading}>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <CustomCalendar
              events={events}
              onEventAdd={handleAddEvent}
              onEventDelete={handleDeleteEvent}
            />
          </CardContent>
        </Card>
      </Spin>
    </Page>
  );
}

export default CalendarPage;
