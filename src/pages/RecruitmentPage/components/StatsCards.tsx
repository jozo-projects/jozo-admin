import { StatCard, StatGrid } from "@/components/shared";
import { Briefcase, Clock, User } from "lucide-react";
import { RecruitmentStats } from "@/@types/Recruitment";

interface StatsCardsProps {
  stats?: RecruitmentStats;
}

const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <StatGrid className="lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Tổng cộng" value={stats?.total || 0} icon={User} />
      <StatCard
        label="Chờ xử lý"
        value={stats?.pending || 0}
        icon={Clock}
        tone="warning"
      />
      <StatCard
        label="Đã xem xét"
        value={stats?.reviewed || 0}
        icon={Briefcase}
        tone="info"
      />
      <StatCard
        label="Đã liên hệ"
        value={stats?.contacted || 0}
        icon={Briefcase}
        tone="info"
      />
      <StatCard
        label="Từ chối"
        value={stats?.rejected || 0}
        icon={Briefcase}
        tone="danger"
      />
      <StatCard
        label="Đã tuyển dụng"
        value={stats?.hired || 0}
        icon={Briefcase}
        tone="success"
      />
    </StatGrid>
  );
};

export default StatsCards;
