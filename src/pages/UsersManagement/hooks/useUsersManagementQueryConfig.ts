import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

export const useUsersManagementQueryConfig = () => {
  const [queryConfig, setQueryConfig] = useQueryStates({
    search: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(10),
  });

  return {
    queryConfig,
    setQueryConfig,
  };
};
