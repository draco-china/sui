import { glassRadii } from "@/lib/glass/edge";

/** Untransformed border-box size, so scaled ancestors do not distort filters. */
export function glassLayoutSize(
  element: HTMLElement,
  rect = element.getBoundingClientRect(),
) {
  const style = getComputedStyle(element);
  const dimension = (axis: "width" | "height") => {
    const value = Number.parseFloat(style[axis]);
    if (Number.isFinite(value) && value > 0) {
      if (style.boxSizing === "border-box") return value;
      const sides = axis === "width" ? ["left", "right"] : ["top", "bottom"];
      return (
        value +
        sides.reduce(
          (sum, side) =>
            sum +
            (Number.parseFloat(style.getPropertyValue(`padding-${side}`)) ||
              0) +
            (Number.parseFloat(
              style.getPropertyValue(`border-${side}-width`),
            ) || 0),
          0,
        )
      );
    }
    return (
      (axis === "width" ? element.offsetWidth : element.offsetHeight) ||
      rect[axis]
    );
  };
  return { width: dimension("width"), height: dimension("height") };
}

/** Border radii resolved against the layout size and scaled to the painted box. */
export function glassSurfaceRadii(
  element: HTMLElement,
  rect: DOMRect,
  style: CSSStyleDeclaration,
): [string, string, string, string] {
  const size = glassLayoutSize(element, rect);
  const corners = glassRadii(size.width, size.height, [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ]);
  return corners.map(
    ({ x, y }) =>
      `${(x * rect.width) / size.width}px ${(y * rect.height) / size.height}px`,
  ) as [string, string, string, string];
}
