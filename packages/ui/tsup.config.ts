import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "components/button": "src/components/button.tsx",
    "components/card": "src/components/card.tsx",
    "components/input": "src/components/input.tsx",
    "components/badge": "src/components/badge.tsx",
    "components/avatar": "src/components/avatar.tsx",
    "components/select": "src/components/select.tsx",
    "components/dialog": "src/components/dialog.tsx",
    "components/dropdown-menu": "src/components/dropdown-menu.tsx",
    "components/code-block": "src/components/code-block.tsx",
    "components/tool-call": "src/components/tool-call.tsx",
    "components/markdown": "src/components/markdown.tsx",
    "components/chat-message": "src/components/chat-message.tsx",
    "components/message-list": "src/components/message-list.tsx",
    "components/chat-input": "src/components/chat-input.tsx",
    "hooks/use-theme": "src/hooks/use-theme.ts",
    "hooks/use-acp-stream": "src/hooks/use-acp-stream.ts",
    "lib/acp-client": "src/lib/acp-client.ts",
    "lib/figma-service": "src/lib/figma-service.ts",
    "i18n/index": "src/i18n/index.ts",
    "lib/utils": "src/lib/utils.ts",
    "stores/config-store": "src/stores/config-store.ts",
    "stores/connection-store": "src/stores/connection-store.ts",
    "stores/message-store": "src/stores/message-store.ts",
    "stores/session-store": "src/stores/session-store.ts",
  },
  format: ["esm", "cjs"],
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: true,
  external: ["react", "react-dom"],
  treeshake: true,
  esbuildOptions(opts) {
    opts.jsx = "automatic";
  },
  loader: {
    ".css": "copy",
  },
});
