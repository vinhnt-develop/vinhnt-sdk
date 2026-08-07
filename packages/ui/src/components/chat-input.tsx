import { forwardRef, useState, useMemo, useRef, useEffect, type ComponentProps } from "react";
import { Plus, ChevronDown, Search, Check, ShieldQuestion, Heart, Eye, Hammer, Cpu, X } from "lucide-react";
import { cn } from "../lib/utils";
import type { ChatRunMode } from "../lib/acp-client";
import type { ProviderInfo } from "../lib/api-client";
import { fetchModels } from "../lib/api-client";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./dropdown-menu";

export interface ChatInputProps extends ComponentProps<"div"> {
  onSend?: (text: string, options?: { model?: string; mode?: ChatRunMode }) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Registered providers with their supported models (grouped popup). */
  providers?: ProviderInfo[];
  defaultModel?: string;
  onPlus?: () => void;
}

interface ModeMeta {
  value: ChatRunMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Icon for each permission mode (uses theme border/output).
const MODES: ModeMeta[] = [
  { value: "ask", label: "Ask for approval", description: "Ask before risky actions (default)", icon: ShieldQuestion },
  { value: "auto", label: "Auto-approve", description: "Auto-approve all actions, no questions", icon: Heart },
  { value: "plan", label: "Plan", description: "Read-only — no file or command changes", icon: Eye },
  { value: "build", label: "Build", description: "Full access — create and modify files", icon: Hammer },
];

// Custom small modal (avoid Radix Dialog portability issues). Fixed, centered.
function ModelPicker({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      {/* Panel */}
      <div className="relative flex max-h-[60vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface/95 text-foreground shadow-2xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95" style={{ maxWidth: 360 }}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold leading-none tracking-tight">
              <Cpu className="size-4 text-primary" /> {title}
            </h2>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const ChatInput = forwardRef<HTMLDivElement, ChatInputProps>(({ onSend, placeholder = "What do you want to do?", disabled, className, providers, defaultModel, onPlus, ...props }, ref) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<ChatRunMode>("ask");
  const [model, setModel] = useState<string | undefined>(defaultModel);
  const [query, setQuery] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [selfProviders, setSelfProviders] = useState<ProviderInfo[] | null>(null);

  // Self-contained fallback: load providers directly when parent didn't pass them.
  useEffect(() => {
    if (providers && providers.length > 0) {
      setSelfProviders(null);
      return;
    }
    let cancelled = false;
    fetchModels()
      .then((res) => { if (!cancelled) setSelfProviders(res.providers); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [providers]);

  const effectiveProviders = providers && providers.length > 0 ? providers : (selfProviders ?? []);

  // Flatten model list — every provider + its supported models.
  const groups = useMemo(() => {
    if (!effectiveProviders || effectiveProviders.length === 0) return [];
    return effectiveProviders
      .map((p) => ({
        provider: p.provider,
        label: p.label || p.provider,
        configured: p.configured,
        models: (p.models ?? []).map((m) => m.id).filter(Boolean),
      }))
      .filter((g) => g.models.length > 0);
  }, [effectiveProviders]);

  const hasModels = groups.length > 0;

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        models: g.models.filter((m) => m.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.models.length > 0);
  }, [groups, query]);

  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0]!;
  const ActiveModeIcon = activeMode.icon;

  const currentModelLabel = useMemo(() => {
    const target = model ?? defaultModel;
    if (!target) return hasModels ? `${groups[0]!.label} · ${groups[0]!.models[0] ?? ""}` : "auto";
    const g = groups.find((grp) => grp.models.includes(target));
    return g ? `${g.label} · ${target}` : target;
  }, [model, defaultModel, groups, hasModels]);

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    const selected = model ?? groups[0]?.models[0];
    onSend?.(text, { model: selected, mode });
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const closePicker = () => {
    setModelOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={ref}
      data-slot="chat-input"
      className={cn(
        "mx-auto w-full max-w-2xl rounded-xl border border-border bg-card shadow-lg transition-all focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30",
        className
      )}
      {...props}
    >
      {/* Top text input row */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="min-h-[24px] max-h-40 flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-none border-none py-1.5 focus:ring-0 focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-1.5 mt-0.5">
          <Button
            type="button"
            onClick={handleSend}
            size="icon"
            disabled={!value.trim() || disabled}
            className="size-9 shrink-0"
            title="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Bottom action row */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        {/* Left: plus + mode */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onPlus}
            title={onPlus ? "Start a project or attach a file" : "Attach"}
            className="size-7 shrink-0 rounded-md text-muted-foreground"
          >
            <Plus className="size-4" />
          </Button>

          {/* Mode selector — shadcn DropdownMenu */}
          <DropdownMenu onOpenChange={(o) => { if (!o) setQuery(""); }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 max-w-[150px] justify-start rounded-md px-2 text-muted-foreground"
                title={`${activeMode.label} — ${activeMode.description}`}
              >
                <ActiveModeIcon className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate">{activeMode.label}</span>
                <ChevronDown className="size-3 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 p-1">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = m.value === mode;
                return (
                  <DropdownMenuItem key={m.value} onSelect={() => setMode(m.value)} className="flex items-start gap-2.5 px-2 py-1.5">
                    <Icon className={cn("size-4 shrink-0 mt-0.5", active ? "text-primary" : "text-muted-foreground/60")} />
                    <span className="min-w-0 flex flex-col gap-0.5">
                      <span className={cn("text-[13px] font-medium", active ? "text-foreground" : "text-foreground/90")}>{m.label}</span>
                      <span className="text-[11px] text-muted-foreground/70 leading-snug">{m.description}</span>
                    </span>
                    {active && <Check className="size-4 shrink-0 text-primary ml-auto mt-0.5" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: model selector — plain button opens custom modal with search */}
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setModelOpen(true)}
          className="h-7 max-w-[200px] justify-start rounded-md px-2 text-muted-foreground"
          title={currentModelLabel}
        >
          <Cpu className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{currentModelLabel}</span>
          <ChevronDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </div>

      {/* Model picker modal */}
      <ModelPicker
        open={modelOpen}
        title="Select model"
        description="Choose the provider and model the agent will use."
        onClose={closePicker}
      >
        {/* Search */}
        <div className="shrink-0 px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-container-low px-2.5 py-1.5 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30">
            <Search className="size-3.5 shrink-0 text-muted-foreground/50" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search provider or model..."
              className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="shrink-0 text-muted-foreground/40 hover:text-foreground" title="Clear search">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grouped list */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-1.5 py-1.5">
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground/50">
              {effectiveProviders.length === 0 ? "Loading models..." : "No matching models found"}
            </div>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.provider}>
                <div className="flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  <span className="truncate">{g.label}</span>
                  {!g.configured && <span className="ml-2 shrink-0 rounded bg-amber-500/15 px-1 py-px text-[9px] font-semibold text-amber-600 dark:text-amber-400">not configured</span>}
                </div>
                {g.models.map((m) => {
                  const active = model === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModel(m);
                        closePicker();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                        active ? "bg-primary/10 text-foreground font-semibold" : "text-muted-foreground/80 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <span className="min-w-0 truncate">{m}</span>
                      {active && <Check className="size-4 ml-auto shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </ModelPicker>
    </div>
  );
});
ChatInput.displayName = "ChatInput";