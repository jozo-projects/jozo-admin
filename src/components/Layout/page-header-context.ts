import { createContext } from "react";

/** Vị trí hiển thị tiêu đề trang trong thanh điều hướng dùng chung. */
export const PageHeaderTargetContext = createContext<HTMLElement | null>(null);
