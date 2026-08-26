import { AgentGraph } from "./agent-graph.js";
import type { AgentId } from "@vinhnt-sdk/schema";

/**
 * Create a sequential workflow that runs agents in order.
 *
 * @example
 * ```ts
 * const workflow = createSequentialWorkflow("my-workflow", "My Workflow", [
 *   { agentId: "analyzer", inputTemplate: "{{input}}" },
 *   { agentId: "coder", inputTemplate: "{{prev.output}}" },
 *   { agentId: "reviewer", inputTemplate: "{{prev.output}}" },
 * ]);
 * ```
 */
export function createSequentialWorkflow(
  id: string,
  name: string,
  steps: { agentId: AgentId; inputTemplate?: string }[],
): AgentGraph {
  const graph = new AgentGraph(id, name);

  steps.forEach((step, index) => {
    const nodeId = `step-${index}`;
    graph.addNode({
      id: nodeId,
      type: "agent",
      agentId: step.agentId,
      ...(step.inputTemplate !== undefined ? { inputTemplate: step.inputTemplate } : {}),
    });

    if (index > 0) {
      graph.addEdge(`step-${index - 1}`, nodeId);
    }
  });

  if (steps.length > 0) {
    graph.setEntry("step-0");
  }

  return graph;
}

/**
 * Create a parallel workflow that runs multiple agents concurrently.
 *
 * @example
 * ```ts
 * const workflow = createParallelWorkflow("review-workflow", "Code Review", [
 *   { agentId: "security-reviewer", inputTemplate: "{{input}}" },
 *   { agentId: "performance-reviewer", inputTemplate: "{{input}}" },
 *   { agentId: "style-reviewer", inputTemplate: "{{input}}" },
 * ]);
 * ```
 */
export function createParallelWorkflow(
  id: string,
  name: string,
  branches: { agentId: AgentId; inputTemplate?: string }[],
): AgentGraph {
  const graph = new AgentGraph(id, name);

  const parallelNodeId = "parallel-root";
  graph.addNode({
    id: parallelNodeId,
    type: "parallel",
    branches: branches.map((_, index) => `branch-${index}`),
  });

  branches.forEach((branch, index) => {
    const nodeId = `branch-${index}`;
    graph.addNode({
      id: nodeId,
      type: "agent",
      agentId: branch.agentId,
      ...(branch.inputTemplate !== undefined ? { inputTemplate: branch.inputTemplate } : {}),
    });
    graph.addEdge(parallelNodeId, nodeId);
  });

  graph.setEntry(parallelNodeId);
  return graph;
}
