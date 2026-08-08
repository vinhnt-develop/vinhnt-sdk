import type {
  Workflow,
  AnyWorkflowNode,
  WorkflowEdge,
  WorkflowNodeResult,
  WorkflowResult,
} from "./types.js";
import type { AgentId, RequestContext } from "@vinhnt-sdk/schema";

export interface GraphExecutor {
  runAgent(agentId: AgentId, prompt: string, ctx: RequestContext): Promise<string>;
}

export interface GraphContext {
  readonly executor: GraphExecutor;
  readonly requestId: string;
  readonly traceId: string;
}

export class AgentGraph {
  private readonly nodes = new Map<string, AnyWorkflowNode>();
  private readonly edges: WorkflowEdge[] = [];
  private entryNode: string | undefined;

  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly description?: string,
  ) {}

  /** Add a node to the graph. */
  addNode(node: AnyWorkflowNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  /** Add an edge between nodes. */
  addEdge(from: string, to: string, label?: string): this {
    this.edges.push({ from, to, label });
    return this;
  }

  /** Set the entry node. */
  setEntry(nodeId: string): this {
    this.entryNode = nodeId;
    return this;
  }

  /** Build the workflow definition. */
  build(): Workflow {
    if (!this.entryNode) {
      throw new Error("Entry node not set");
    }
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      entryNode: this.entryNode,
      nodes: [...this.nodes.values()],
      edges: [...this.edges],
    };
  }

  /** Execute the workflow. */
  async execute(ctx: GraphContext): Promise<WorkflowResult> {
    const workflow = this.build();
    const startTime = Date.now();
    const nodeResults: WorkflowNodeResult[] = [];

    try {
      const finalOutput = await this.executeNode(workflow.entryNode, ctx, nodeResults, new Map());
      return {
        workflowId: this.id,
        status: "completed",
        nodeResults,
        finalOutput,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        workflowId: this.id,
        status: "failed",
        nodeResults,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async executeNode(
    nodeId: string,
    ctx: GraphContext,
    results: WorkflowNodeResult[],
    variables: Map<string, string>,
  ): Promise<string> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const startTime = Date.now();
    let output: string | undefined;
    let status: "completed" | "failed" = "completed";

    try {
      switch (node.type) {
        case "agent": {
          const prompt = node.inputTemplate
            ? this.interpolate(node.inputTemplate, variables)
            : variables.get("input") ?? "";
          output = await ctx.executor.runAgent(node.agentId, prompt, {
            requestId: ctx.requestId,
            traceId: ctx.traceId,
          } as RequestContext);
          break;
        }
        case "parallel": {
          const branchResults = await Promise.all(
            node.branches.map((branchId) =>
              this.executeNode(branchId, ctx, results, variables)
            )
          );
          output = branchResults.join("\n---\n");
          break;
        }
        case "sequential": {
          let lastOutput = "";
          for (const stepId of node.steps) {
            lastOutput = await this.executeNode(stepId, ctx, results, variables);
            variables.set("prev.output", lastOutput);
          }
          output = lastOutput;
          break;
        }
        case "condition": {
          const conditionResult = this.evaluateCondition(node.condition, variables);
          const nextNode = conditionResult ? node.trueEdge : node.falseEdge;
          output = await this.executeNode(nextNode, ctx, results, variables);
          break;
        }
        case "transform": {
          output = this.evaluateTransform(node.transform, variables);
          break;
        }
      }
    } catch (error) {
      status = "failed";
      throw error;
    } finally {
      results.push({
        nodeId,
        status,
        output,
        durationMs: Date.now() - startTime,
      });
    }

    return output ?? "";
  }

  private interpolate(template: string, variables: Map<string, string>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key: string) => {
      return variables.get(key) ?? `{{${key}}}`;
    });
  }

  private evaluateCondition(condition: string, variables: Map<string, string>): boolean {
    const interpolated = this.interpolate(condition, variables);
    try {
      return Boolean(eval(interpolated));
    } catch {
      return false;
    }
  }

  private evaluateTransform(transform: string, variables: Map<string, string>): string {
    return this.interpolate(transform, variables);
  }
}
