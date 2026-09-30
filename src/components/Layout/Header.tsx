import Typography from "../ui/typography";
import { LogoutButton } from "../shared/LogoutButton";
import { NotificationBell } from "../shared/NotificationBell";

type Props = {
  title: string;
  subtitle?: string;
  showLogout?: boolean;
};
function Header(props: Props) {
  const { title, subtitle, showLogout = false } = props;

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">{title}</Typography>

          {subtitle && (
            <Typography variant="p" className="mt-1">
              {subtitle}
            </Typography>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          {showLogout && (
            <LogoutButton variant="outline" size="sm" showIcon={false}>
              Đăng xuất
            </LogoutButton>
          )}
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-border" />
    </div>
  );
}

export default Header;
