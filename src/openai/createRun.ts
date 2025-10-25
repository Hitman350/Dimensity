import OpenAI from "openai";
import { Run } from "openai/resources/beta/threads/runs/runs.js";
import { Thread } from "openai/resources/beta/threads/threads.js";
import { resolve } from "path";

export async function createRun(
  client: OpenAI,
  thread: Thread,
  assistantId: string
): Promise<Run> {
  console.log(
    `Creating run for thread ${thread.id} with assistant ${assistantId}`
  );
  let run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
  });

  while (run.status === "in_progress" || run.status === "queued") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    run = await client.beta.threads.runs.retrieve(run.id, {
      thread_id: thread.id,
    });
  }

  return run;
}
