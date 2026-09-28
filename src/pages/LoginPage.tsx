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
import { AUTH_EVENTS } from "@/constants/events";
import PATHS from "@/constants/paths";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { loginSchema } from "@/utils/schema";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "@tanstack/react-router";

type FormValues = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Load dark mode từ localStorage khi component mount
  useEffect(() => {
    const darkMode = localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: PATHS.HOME, replace: true });
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<FormValues>({
    defaultValues: {
      username: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  const { control, handleSubmit } = form;

  const { mutate } = useMutation({
    mutationFn: authorizationApis.login,
    onSuccess: ({ data }) => {
      localStorage.setItem("access_token", data.result?.access_token || "");
      localStorage.setItem("refresh_token", data.result?.refresh_token || "");

      // Dispatch event login success
      window.dispatchEvent(new Event(AUTH_EVENTS.LOGIN_SUCCESS));

      toast({
        title: data.message,
      });

      // Navigate sẽ được xử lý bởi useEffect khi isAuthenticated thay đổi
      // Không cần gọi getMe() trực tiếp vì useQuery trong AuthContext sẽ tự động fetch
    },
    onError: (error) => {
      toast({
        title: error.message,
        className: "bg-red-500 text-white",
      });
    },
  });

  const [hidePassword, setHidePassword] = useState<boolean>(true);

  const togglePassword = () => setHidePassword(!hidePassword);

  const onSubmit = (data: FormValues) => {
    mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card text-card-foreground p-6 rounded shadow-md w-full max-w-sm border border-border"
        >
          <Typography variant="h2" className="mb-4">
            Login
          </Typography>

          <FormField
            control={control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Enter username" {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem className="mt-1">
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type={hidePassword ? "password" : "text"}
                    placeholder="Enter password"
                    {...field}
                    suffix={
                      <button
                        className="p-1 text-foreground"
                        type="button"
                        onClick={togglePassword}
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

          <Button type="submit" className="w-full mt-4">
            Login
          </Button>

          <Link
            to={PATHS.FORGOT_PASSWORD}
            className={cn(
              buttonVariants({ variant: "link", className: "w-full px-0 mt-2" }),
            )}
          >
            Quên mật khẩu?
          </Link>
        </form>
      </Form>
    </div>
  );
}
