import authorizationApis from "@/apis/authorization.apis";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Typography from "@/components/ui/typography";
import PATHS from "@/constants/paths";
import { useToast } from "@/hooks/use-toast";
import { resetPasswordSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { cn } from "@/lib/utils";

type FormValues = z.infer<typeof resetPasswordSchema>;

const TOKEN_EXPIRED_MESSAGE =
  "Không thể đặt lại mật khẩu. Link có thể đã hết hạn (15 phút) hoặc không hợp lệ. Vui lòng yêu cầu link mới.";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const search = useSearch({ from: PATHS.RESET_PASSWORD });
  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const forgotPasswordToken = useMemo(
    () =>
      search.forgot_password_token ||
      search.token ||
      "",
    [search.forgot_password_token, search.token],
  );

  useEffect(() => {
    const darkMode = localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  const form = useForm<FormValues>({
    defaultValues: {
      password: "",
      confirm_password: "",
    },
    resolver: zodResolver(resetPasswordSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: authorizationApis.resetPassword,
    onSuccess: (response) => {
      toast({
        title: response.data.message || "Đặt lại mật khẩu thành công",
      });
      navigate({ to: PATHS.LOGIN, replace: true });
    },
    onError: (error: unknown) => {
      const apiMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : null;

      setSubmitError(
        apiMessage
          ? `${TOKEN_EXPIRED_MESSAGE} (${apiMessage})`
          : TOKEN_EXPIRED_MESSAGE,
      );
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!forgotPasswordToken) {
      setSubmitError(TOKEN_EXPIRED_MESSAGE);
      return;
    }

    setSubmitError(null);
    mutate({
      forgot_password_token: forgotPasswordToken,
      password: data.password,
      confirm_password: data.confirm_password,
    });
  };

  if (!forgotPasswordToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="bg-card text-card-foreground p-6 rounded shadow-md w-full max-w-sm border border-border space-y-4">
          <Typography variant="h2">Link không hợp lệ</Typography>
          <p className="text-sm text-muted-foreground">
            {TOKEN_EXPIRED_MESSAGE}
          </p>

          <Link
            to={PATHS.LOGIN}
            className={cn(
              buttonVariants({ variant: "link", className: "w-full px-0" }),
            )}
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-card text-card-foreground p-6 rounded shadow-md w-full max-w-sm border border-border"
        >
          <Typography variant="h2" className="mb-2">
            Đặt lại mật khẩu
          </Typography>
          <Typography
            variant="p"
            className="mb-4 text-muted-foreground text-sm"
          >
            Mật khẩu mới phải có độ dài từ 6–8 ký tự. Link đặt lại có hiệu lực
            trong 15 phút.
          </Typography>

          {submitError && (
            <p className="mb-4 text-sm text-destructive">{submitError}</p>
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mật khẩu mới</FormLabel>
                <FormControl>
                  <Input
                    type={hidePassword ? "password" : "text"}
                    placeholder="Nhập mật khẩu mới"
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                    suffix={
                      <button
                        className="p-1 text-foreground"
                        type="button"
                        onClick={() => setHidePassword((prev) => !prev)}
                      >
                        {hidePassword ? <EyeIcon /> : <EyeOffIcon />}
                      </button>
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem className="mt-1">
                <FormLabel>Xác nhận mật khẩu</FormLabel>
                <FormControl>
                  <Input
                    type={hideConfirmPassword ? "password" : "text"}
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                    suffix={
                      <button
                        className="p-1 text-foreground"
                        type="button"
                        onClick={() => setHideConfirmPassword((prev) => !prev)}
                      >
                        {hideConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                      </button>
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-4" disabled={isPending}>
            {isPending ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
