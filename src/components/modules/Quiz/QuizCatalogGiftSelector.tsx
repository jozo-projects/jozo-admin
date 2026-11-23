import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchMenuItems, menuItemsQueryKeys } from "@/hooks/use-menu-items";
import { QuizGiftSelector, type QuizGiftSelection } from "./QuizGiftSelector";
import { quizGiftOptionsFromMenu } from "./quiz-gift-catalog";

/** Catalog-connected adapter; campaign persistence is intentionally owned by the caller. */
export function QuizCatalogGiftSelector(props: { value: QuizGiftSelection[]; onChange: (value: QuizGiftSelection[]) => void; disabled?: boolean }) {
  const query = useQuery({ queryKey: menuItemsQueryKeys.lists(), queryFn: fetchMenuItems });
  if (query.isPending) return <><p>Đang tải danh mục món…</p>{props.value.map((item, i) => <p key={i}>{item.name || item.menuItemId || "Quà cũ"} × {item.quantity}</p>)}</>;
  if (query.isError) return <><div role="alert">Không thể tải danh mục món. <Button type="button" variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></div><QuizGiftSelector {...props} options={[]} /></>;
  return <QuizGiftSelector {...props} options={quizGiftOptionsFromMenu(query.data)} />;
}
