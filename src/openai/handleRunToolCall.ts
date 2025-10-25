import OpenAI from "openai";
import { Run } from "openai/resources/beta/threads/runs/runs.js";
import { Thread } from "openai/resources/beta/threads/threads.js";
import { tools } from "../tools/allTools";

export async function handleRunToolCalls(
  run: Run,
  client: OpenAI,
  thread: Thread
): Promise<Run> {
  const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls;
  if (!toolCalls) return run;

  const toolOutputs = await Promise.all(
    toolCalls.map(async (tool) => {
      const toolConfig = tools[tool.function.name]; // checking whether inside allTools.ts, we have that function or not
      if (!toolConfig) {
        console.error(`Tool ${tool.function.name} not found`);
        return null;
      }

      console.log(
        `Executing tool: ${tool.function.name} with args: ${tool.function.arguments}`
      );

      try {
        const args = JSON.parse(tool.function.arguments);
        const output = await toolConfig.handler(args);

        console.log(
          `Tool ${tool.function.name} executed with output: ${output}`
        );

        return {
          tool_call_id: tool.id,
          output: String(output),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          tool_call_id: tool.id,
          output: `Error: ${errorMessage}`,
        };
      }
    })
  ); // We are expecting that there may be multiple tools to run
  // thus iterating through everyone of their handler functions which tell us what that tool does

  const validOutputs = toolOutputs.filter(
    Boolean
  ) as OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[];
  if (validOutputs.length === 0) return run;

  return client.beta.threads.runs.submitToolOutputsAndPoll(run.id, {
    tool_outputs: validOutputs,
    thread_id: thread.id,
  }); // We are submiting tool Outputs to the run
}
