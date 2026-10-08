import { describe, expect, test } from "bun:test";
import { getLocale, isLocale, localePath } from "../src/lib/i18n";

describe("language routing", () => {
  test("defaults to en-US and supports exact language codes", () => {
    expect(getLocale()).toBe("en-US");
    expect(getLocale("zh-CN")).toBe("zh-CN");
    expect(isLocale("en-US")).toBe(true);
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("zh")).toBe(false);
    expect(isLocale("fr-FR")).toBe(false);
  });
  test("switches prefixes without replacing document, query or anchor", () => {
    const path = "/docs/components/button?example=outline#usage";
    expect(localePath("zh-CN", path)).toBe(`/zh-CN${path}`);
    expect(localePath("en-US", `/zh-CN${path}`)).toBe(path);
    expect(localePath("en-US", `/en-US${path}`)).toBe(path);
    expect(localePath("zh-CN", "/")).toBe("/zh-CN");
    expect(localePath("en-US", "/zh-CN")).toBe("/");
  });
});
