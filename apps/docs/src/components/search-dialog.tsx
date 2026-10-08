import { useDocsSearch } from "fumadocs-core/search/client";
import { fetchClient } from "fumadocs-core/search/client/fetch";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import type { SharedProps } from "fumadocs-ui/contexts/search";

export function DocumentationSearch(props: SharedProps) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    client: fetchClient({ api: "/api/search", locale }),
  });
  return (
    <SearchDialog
      {...props}
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        {query.error ? (
          <p className="p-6 text-fd-muted-foreground text-sm" role="alert">
            {locale === "zh-CN"
              ? "搜索暂时不可用，请重试或使用文档导航"
              : "Search is unavailable. Try again or use the documentation navigation."}
          </p>
        ) : (
          <SearchDialogList
            items={query.data === "empty" ? null : query.data}
          />
        )}
      </SearchDialogContent>
    </SearchDialog>
  );
}
