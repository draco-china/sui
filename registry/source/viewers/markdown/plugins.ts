import type { Options as ReactMarkdownOptions } from "react-markdown";
import { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";

export interface MarkdownNode {
  type?: string;
  depth?: number;
  url?: string;
  properties?: Record<string, unknown>;
  lang?: string;
  value?: string;
  data?: Record<string, unknown>;
  children?: MarkdownNode[];
}

/** GitHub alert types and their default titles. */
export const alertTitles = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

export type AlertType = keyof typeof alertTitles;

const alertTypes = /^(?:note|tip|important|warning|caution)$/;

// Raw HTML keeps the GitHub defaults; only what the remark plugins emit is
// added. Classes stay restricted, so content cannot apply app utilities such
// as `fixed inset-0` to cover the page.
export const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", /^language-./, "math-inline", "math-display"]],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      [
        "className",
        /^markdown-alert(?:-title)?(?:-(?:note|tip|important|warning|caution))?$/,
      ],
      ["dataAlert", alertTypes],
    ],
    // Task list checkboxes only, which may be checked.
    input: [["disabled", true], ["type", "checkbox"], "checked"],
    td: [["align", "left", "center", "right"]],
    th: [["align", "left", "center", "right"]],
  },
};

export const markdownRemarkPlugins: ReactMarkdownOptions["remarkPlugins"] = [
  remarkGfm,
  remarkViewerHeadingIds,
  [remarkToc, { heading: "contents|table[ -]of[ -]contents|toc", tight: true }],
  remarkBreaks,
  remarkMath,
  remarkMathCodeBlocks,
  remarkGitHubAlerts,
];

/**
 * While a reply streams in, its last code fence may still be open. Closing
 * it lets that block render as code instead of swallowing the text after it.
 */
export function closeOpenFence(content: string) {
  const fences = content.match(/^ {0,3}(`{3,}|~{3,})/gm) ?? [];
  if (fences.length % 2 === 0) return content;
  const marker = fences[fences.length - 1].trim();
  return `${content.replace(/\n?$/, "\n")}${marker}`;
}
function remarkMathCodeBlocks() {
  return (tree: MarkdownNode) => {
    walkMarkdownNode(tree, (node) => {
      if (node.type !== "code" || node.lang !== "math") return;
      node.type = "math";
      node.lang = undefined;
    });
  };
}

function remarkGitHubAlerts() {
  return (tree: MarkdownNode) => {
    walkMarkdownNode(tree, (node) => {
      if (node.type !== "blockquote") return;

      const firstParagraph = node.children?.[0];
      const firstText = firstParagraph?.children?.[0];
      if (
        firstParagraph?.type !== "paragraph" ||
        firstText?.type !== "text" ||
        !firstText.value
      ) {
        return;
      }

      const match = firstText.value.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*\n?/i,
      );
      if (!match) return;

      const type = match[1].toLowerCase() as AlertType;
      if (!(type in alertTitles)) return;

      firstText.value = firstText.value
        .slice(match[0].length)
        .replace(/^\s+/, "");
      while (
        firstParagraph.children?.[0] &&
        isEmptyAlertLeadNode(firstParagraph.children[0])
      ) {
        firstParagraph.children.shift();
      }
      if (firstParagraph.children?.length === 0) {
        node.children?.shift();
      }
      node.data = {
        hName: "div",
        hProperties: {
          className: `markdown-alert markdown-alert-${type}`,
          dataAlert: type,
        },
      };
      node.children?.unshift({
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: {
            className: `markdown-alert-title markdown-alert-title-${type}`,
          },
        },
        children: [{ type: "text", value: alertTitles[type] }],
      });
    });
  };
}

function isEmptyAlertLeadNode(node: MarkdownNode) {
  return (
    (node.type === "text" && (node.value ?? "").trim().length === 0) ||
    node.type === "break"
  );
}

export function walkMarkdownNode(
  node: MarkdownNode,
  visitor: (node: MarkdownNode) => void,
) {
  visitor(node);
  if (!node.children) return;
  for (const child of node.children) {
    walkMarkdownNode(child, visitor);
  }
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-");
  return slug || "section";
}

function markdownNodeText(node: MarkdownNode): string {
  return node.value ?? node.children?.map(markdownNodeText).join("") ?? "";
}
function remarkViewerHeadingIds() {
  return (tree: MarkdownNode) => {
    const used = new Map<string, number>();
    walkMarkdownNode(tree, (node) => {
      if (node.type !== "heading") return;
      const slug = slugify(markdownNodeText(node));
      const occurrence = used.get(slug) ?? 0;
      used.set(slug, occurrence + 1);
      node.data = {
        ...node.data,
        hProperties: {
          ...((node.data?.hProperties as object) ?? {}),
          id: occurrence ? `${slug}-${occurrence}` : slug,
        },
      };
    });
  };
}
export function rehypeViewerAnchors({ prefix }: { prefix: string }) {
  return (tree: MarkdownNode) => {
    const ids = new Map<string, string>();
    const used = new Set<string>();
    walkMarkdownNode(tree, (node) => {
      const props = node.properties;
      if (!props) return;
      for (const property of ["id", "name"])
        if (typeof props[property] === "string") {
          const previous = props[property];
          let next = `${prefix}-${previous}`;
          let duplicate = 1;
          while (used.has(next)) next = `${prefix}-${previous}-${duplicate++}`;
          used.add(next);
          props[property] = next;
          if (!ids.has(previous)) ids.set(previous, next);
          const original = previous.replace(/^(user-content-)+/, "");
          if (!ids.has(original)) ids.set(original, next);
        }
    });
    walkMarkdownNode(tree, (node) => {
      const props = node.properties;
      if (!props) return;
      if (typeof props.href === "string" && props.href.startsWith("#")) {
        const target = ids.get(props.href.slice(1));
        if (target) props.href = `#${target}`;
      }
      for (const property of ["ariaDescribedBy", "ariaLabelledBy"]) {
        const value = props[property];
        if (Array.isArray(value))
          props[property] = value.map((id) =>
            typeof id === "string" ? (ids.get(id) ?? id) : id,
          );
        else if (typeof value === "string")
          props[property] = value
            .split(/\s+/)
            .map((id) => ids.get(id) ?? id)
            .join(" ");
      }
    });
  };
}
