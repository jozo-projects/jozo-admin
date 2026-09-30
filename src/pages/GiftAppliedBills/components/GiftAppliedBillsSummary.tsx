import { StatCard, StatGrid } from "@/components/shared";
import { formatCurrency } from "@/utils/formatters";
import { Gift, Sparkles, TrendingDown, Users, Zap } from "lucide-react";
import type { GiftAppliedBillsSummary } from "../constants";

interface GiftAppliedBillsSummaryProps {
  summary?: GiftAppliedBillsSummary;
}

const formatMoney = (value: number) => `${formatCurrency(value || 0)} VNĐ`;

const GiftAppliedBillsSummaryCards = ({
  summary,
}: GiftAppliedBillsSummaryProps) => {
  const totalDiscount =
    (summary?.totalGiftDiscountAmount ?? 0) +
    (summary?.totalMembershipDiscountAmount ?? 0);

  return (
    <StatGrid className="xl:grid-cols-5">
      <StatCard
        label="Tổng bill"
        value={summary?.totalBills ?? 0}
        icon={Gift}
      />
      <StatCard
        label="Membership"
        value={summary?.membershipBills ?? 0}
        icon={Users}
        tone="info"
      />
      <StatCard
        label="Quà tặng"
        value={summary?.giftBills ?? 0}
        icon={Sparkles}
        tone="success"
      />
      <StatCard
        label="Streak"
        value={summary?.streakBills ?? 0}
        icon={Zap}
        tone="info"
      />
      <StatCard
        label="Tổng tiền giảm"
        value={formatMoney(totalDiscount)}
        icon={TrendingDown}
      />
    </StatGrid>
  );
};

export default GiftAppliedBillsSummaryCards;
