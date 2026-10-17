import { useLocation, useNavigate } from "@tanstack/react-router";
import { isLocale, localePath } from "./i18n";

/** Opens the current page in another locale, keeping its query and anchor. */
export function useLocaleNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  return (next: string) => {
    if (!isLocale(next)) return;
    return navigate({
      to: localePath(next, location.pathname),
      search: location.search,
      hash: location.hash,
    });
  };
}
