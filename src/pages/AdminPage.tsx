import RoomTimelineTable from "./RoomSchedule/components/RoomTimelineTable";
import ShiftProgressCard from "@/components/modules/ShiftProgressCard";

function AdminPage() {
  return (
    <div className="min-w-0 w-full">
      <ShiftProgressCard />
      <RoomTimelineTable />
    </div>
  );
}

export default AdminPage;
