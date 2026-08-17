# @vinhnt-sdk/sandbox-host

Host (no-isolation) sandbox backend for `@vinhnt-sdk/sandbox`. Executes commands
locally via `execFile` with a sanitized environment and kills the whole process
tree on abort/timeout.

```typescript
import { createSandbox } from "@vinhnt-sdk/sandbox";
import { createHostSandbox } from "@vinhnt-sdk/sandbox-host";

const sandbox = createSandbox({ defaultTimeoutMs: 30_000, scope: "host" }, {
  host: createHostSandbox,
});
```