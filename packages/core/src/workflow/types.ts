import type { AgentId } from "@vinhnt-sdk/schema";

/** Workflow node types. */
export type WorkflowNodeType = "agent" | "condition" | "transform" | "parallel" | "sequential";

/** Base workflow node. */
export interface WorkflowNode {
  /** Unique node ID. */
  readonly id: string;
  /** Node type. */
  readonly type: WorkflowNodeType;
  /** Node label for display. */
  readonly label?: string;
}

/** Agent node — delegates to an agent. */
export interface AgentNode extends WorkflowNode {
  readonly type: "agent";
  /** Agent ID to delegate to. */
  readonly agentId: AgentId;
  /** Input transformation expression (e.g. "{{prev.output}}"). */
  readonly inputTemplate?: string;
}

/** Condition node — branches based on a predicate. */
export interface ConditionNode extends WorkflowNode {
  readonly type: "condition";
  /** Condition expression (e.g. "{{prev.output}}.includes('error')"). */
  readonly condition: string;
  /** Node ID to follow if true. */
  readonly trueEdge: string;
  /** Node ID to follow if false. */
  readonly falseEdge: string;
}

/** Transform node — transforms data between steps. */
export interface TransformNode extends WorkflowNode {
  readonly type: "transform";
  /** Transform function name or inline expression. */
  readonly transform: string;
}

/** Parallel node — executes multiple branches concurrently. */
export interface ParallelNode extends WorkflowNode {
  readonly type: "parallel";
  /** Node IDs to execute in parallel. */
  readonly branches: string[];
}

/** Sequential node — executes nodes in order. */
export interface SequentialNode extends WorkflowNode {
  readonly type: "sequential";
  /** Ordered list of node IDs. */
  readonly steps: string[];
}

/** Any workflow node type. */
export type AnyWorkflowNode = AgentNode | ConditionNode | TransformNode | ParallelNode | SequentialNode;

/** Workflow edge — connection between nodes. */
export interface WorkflowEdge {
  /** Source node ID. */
  readonly from: string;
  /** Target node ID. */
  readonly to: string;
  /** Optional edge label. */
  readonly label?: string;
}

/** Workflow definition. */
export interface Workflow {
  /** Unique workflow ID. */
  readonly id: string;
  /** Workflow name. */
  readonly name: string;
  /** Workflow description. */
  readonly description?: string;
  /** Entry node ID. */
  readonly entryNode: string;
  /** All nodes in the workflow. */
  readonly nodes: readonly AnyWorkflowNode[];
  /** All edges in the workflow. */
  readonly edges: readonly WorkflowEdge[];
}

/** Workflow execution state. */
export type WorkflowNodeStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/** Node execution result. */
export interface WorkflowNodeResult {
  readonly nodeId: string;
  readonly status: WorkflowNodeStatus;
  readonly output?: string;
  readonly error?: string;
  readonly durationMs?: number;
}

/** Workflow execution result. */
export interface WorkflowResult {
  readonly workflowId: string;
  readonly status: "completed" | "failed";
  readonly nodeResults: readonly WorkflowNodeResult[];
  readonly finalOutput?: string;
  readonly error?: string;
  readonly durationMs: number;
}
