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
import { forgotPasswordSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { cn } from "@/lib/utils";

type FormValues = z.infer<typeof forgotPasswordSchema>;

const SUCCESS_MESSAGE =
  "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong 15 phút.";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const darkMode = localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: authorizationApis.forgotPassword,
    onSuccess: (response) => {
      toast({
        title: response.data.message || SUCCESS_MESSAGE,
      });
      setSubmitted(true);
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
          : "Không thể gửi link đặt lại mật khẩu. Vui lòng thử lại.";

      toast({
        title: apiMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-card text-card-foreground p-6 rounded shadow-md w-full max-w-sm border border-border">
        <Typography variant="h2" className="mb-2">
          Quên mật khẩu
        </Typography>
        <Typography variant="p" className="mb-4 text-muted-foreground text-sm">
          Nhập email đã đăng ký với tài khoản staff. Chỉ tài khoản có email mới
          có thể đặt lại mật khẩu qua email.
        </Typography>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{SUCCESS_MESSAGE}</p>
            <Link
              to={PATHS.LOGIN}
              className={cn(buttonVariants({ className: "w-full" }))}
            >
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Nhập email"
                        autoComplete="email"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
              </Button>

              <Link
                to={PATHS.LOGIN}
                className={cn(
                  buttonVariants({ variant: "link", className: "w-full px-0" }),
                )}
              >
                Quay lại đăng nhập
              </Link>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
