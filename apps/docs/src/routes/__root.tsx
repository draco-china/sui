import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { NavigationProgress } from "@workspace/ui/components/navigation-progress";
import { Toaster } from "@workspace/ui/components/toast";
import { i18nProvider } from "fumadocs-ui/i18n";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import type { ReactNode } from "react";
import { DocumentationLink } from "../components/documentation-link";
import { DocumentationSearch } from "../components/search-dialog";
import { getLocale, isLocale, localePath, translations } from "../lib/i18n";
import { themeBootstrapScript } from "../lib/theme";
import appCss from "../styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SUI — Composable React components" },
      {
        name: "description",
        content:
          "A composable React component library built with Base UI and Tailwind CSS.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
});

function RootDocument({ children }: { children: ReactNode }) {
  const { lang } = useParams({ strict: false });
  const locale = getLocale(lang);
  const location = useLocation();
  const navigate = useNavigate();
  const pending = useRouterState({
    select: (state) => state.status === "pending",
  });
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: This script is generated exclusively from our fixed theme functions and constants, with no request data. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <HeadContent />
        <link
          rel="describedby"
          type="text/plain"
          href={localePath(locale, "/llms.txt")}
        />
      </head>
      <body>
        <RootProvider
          components={{ Link: DocumentationLink }}
          i18n={{
            ...i18nProvider(translations, locale),
            onLocaleChange: (next) => {
              if (isLocale(next))
                void navigate({
                  to: localePath(next, location.pathname),
                  search: location.search,
                  hash: location.hash,
                });
            },
          }}
          theme={{ defaultTheme: "system" }}
          search={{ SearchDialog: DocumentationSearch }}
        >
          <NavigationProgress
            active={pending}
            label={locale === "zh-CN" ? "正在加载页面" : "Loading page"}
          />
          <Toaster>{children}</Toaster>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
