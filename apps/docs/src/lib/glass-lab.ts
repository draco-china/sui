import { examples } from "../examples";
import { components } from "./catalog";

// Components with a material-bearing surface or operation control. Ordinary
// content and layout components remain in the documentation catalog.
const directGlass = new Set([
  "accordion",
  "alert-dialog",
  "attachment",
  "autocomplete",
  "button",
  "calendar",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "clipboard-text",
  "code-viewer",
  "color-picker",
  "combobox",
  "command",
  "context-menu",
  "dialog",
  "diff-viewer",
  "drawer",
  "dropdown-menu",
  "editor",
  "glass",
  "hover-card",
  "image-viewer",
  "inline-copy-text",
  "input",
  "input-group",
  "input-otp",
  "menubar",
  "message-scroller",
  "native-select",
  "navigation-menu",
  "pagination",
  "popover",
  "questionnaire",
  "radio-group",
  "select",
  "sensitive-input",
  "sheet",
  "slider",
  "switch",
  "tab-bar",
  "tabs",
  "tag-input",
  "textarea",
  "toast",
  "toggle",
  "toggle-group",
  "toolbar",
  "tooltip",
]);

export const glassLabCatalog = components
  .filter((component) => directGlass.has(component.slug))
  .map((component) => {
    const demo = `${component.slug}-demo`;
    return {
      ...component,
      demo: demo in examples ? (demo as keyof typeof examples) : undefined,
    };
  });
