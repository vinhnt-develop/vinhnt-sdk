import { useEffect } from "react";
import { useConfigStore } from "../stores/config-store";
import { changeLanguage } from "../i18n/index";

const FONT_SIZE_MAP: Record<number, number> = {
  12: 13,
  14: 15,
  16: 17,
};

const FONT_FAMILY_MAP: Record<string, string> = {
  monospace: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
  "jetbrains-mono": "'JetBrains Mono', ui-monospace, monospace",
  "fira-code": "'Fira Code', ui-monospace, monospace",
  "source-code-pro": "'Source Code Pro', ui-monospace, monospace",
  roboto: "'Roboto', 'Inter', ui-sans-serif, system-ui, sans-serif",
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

const RADIUS_MAP: Record<string, string> = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
};

export function useAppearance() {
  const { fontSize, fontFamily, borderRadius, compactMode, language, showLineNumbers, showThinkingBlocks, diffStyle } =
    useConfigStore((s) => s.appearance);

  useEffect(() => {
    const root = document.documentElement;
    const px = FONT_SIZE_MAP[fontSize] ?? fontSize;
    root.style.setProperty("--app-font-size", `${px}px`);
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font-family", FONT_FAMILY_MAP[fontFamily] ?? FONT_FAMILY_MAP.monospace!);
  }, [fontFamily]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-radius", RADIUS_MAP[borderRadius] ?? RADIUS_MAP.md!);
  }, [borderRadius]);

  useEffect(() => {
    document.documentElement.classList.toggle("app-compact", compactMode);
  }, [compactMode]);

  useEffect(() => {
    document.documentElement.dataset.lineNumbers = String(showLineNumbers);
  }, [showLineNumbers]);

  useEffect(() => {
    document.documentElement.dataset.thinkingBlocks = String(showThinkingBlocks);
  }, [showThinkingBlocks]);

  useEffect(() => {
    document.documentElement.dataset.diffStyle = diffStyle;
  }, [diffStyle]);

  useEffect(() => {
    changeLanguage(language);
  }, [language]);
}
