import { toast } from "@/hooks/use-toast";
import { AxiosError } from "axios";

type ValidationErrorBody = {
  message?: string;
  errors?: Record<string, ErrorField>;
};

export function getValidationErrorMessages(error: unknown): {
  title: string;
  description: string;
  fieldErrors: Record<string, string>;
} | null {
  const axiosError = error as AxiosError<ValidationErrorBody>;
  const responseData = axiosError?.response?.data;
  const errors = responseData?.errors;

  if (!errors || typeof errors !== "object") {
    return null;
  }

  const fieldErrors: Record<string, string> = {};
  const errorMessages: string[] = [];

  Object.entries(errors).forEach(([field, errorData]) => {
    if (errorData?.msg) {
      fieldErrors[field] = errorData.msg;
      errorMessages.push(errorData.msg);
    }
  });

  if (errorMessages.length === 0) {
    return null;
  }

  return {
    title: responseData?.message || "Validation error",
    description: errorMessages.join(", "),
    fieldErrors,
  };
}

export function showApiValidationErrorToast(
  error: unknown,
  fallback: { title: string; description: string },
  options?: {
    onFieldErrors?: (fieldErrors: Record<string, string>) => void;
  },
): boolean {
  const validation = getValidationErrorMessages(error);

  if (validation) {
    toast({
      title: validation.title,
      description: validation.description,
      variant: "destructive",
    });
    options?.onFieldErrors?.(validation.fieldErrors);
    return true;
  }

  toast({
    title: fallback.title,
    description: fallback.description,
    variant: "destructive",
  });
  return false;
}
