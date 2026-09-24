import { Lock } from "lucide-react";
import Typography from "../ui/typography";
import { Button } from "../ui/button";
import { useRouter } from "@tanstack/react-router";
import PATHS from "@/constants/paths";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = "Không có quyền truy cập",
  message = "Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
  showBackButton = true,
}) => {
  const router = useRouter();

  const handleBackToHome = () => {
    router.navigate({ to: PATHS.HOME });
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <Lock className="size-6 text-destructive" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Typography variant="h2" className="text-foreground">
            {title}
          </Typography>
          <Typography variant="p" className="max-w-md">
            {message}
          </Typography>
        </div>

        {showBackButton && (
          <Button onClick={handleBackToHome} className="mt-4">
            Về trang chủ
          </Button>
        )}
      </div>
    </div>
  );
};

export default AccessDenied;
