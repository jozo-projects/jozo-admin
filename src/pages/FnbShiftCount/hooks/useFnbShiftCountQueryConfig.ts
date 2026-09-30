import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { getFnbBusinessDate } from "../utils";

export const useFnbShiftCountQueryConfig = () => {
  const [queryConfig, setQueryConfig] = useQueryStates({
    tab: parseAsString.withDefault("entry"),
    date: parseAsString.withDefault(getFnbBusinessDate()),
    search: parseAsString.withDefault(""),
    historyFrom: parseAsString.withDefault(""),
    historyTo: parseAsString.withDefault(""),
    historyPage: parseAsInteger.withDefault(1),
    historyLimit: parseAsInteger.withDefault(20),
  });

  return {
    queryConfig,
    setQueryConfig,
  };
};
