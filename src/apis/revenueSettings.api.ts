import http from "@/utils/http";
import type { RevenueSettings } from "@/utils/revenuePeriod";

export const revenueSettingsKey = ["revenue-settings"] as const;
export const getRevenueSettings = async () => (await http.get<RevenueSettings>("/revenue-settings")).data;
export const saveRevenueSettings = async (settings: RevenueSettings) => (await http.put<RevenueSettings>("/revenue-settings", settings)).data;
