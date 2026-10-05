// Test-only local transport fixture, never imported into the application.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { setTimeout } from "node:timers";
import process from "node:process";
const cases = JSON.parse(
  await readFile(
    new URL("../fixtures/formation-cases.json", import.meta.url),
    "utf8",
  ),
);
const attempts = new Map();
const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.end("ok");
    return;
  }
  if (
    req.url !== "/v1/chat/completions" ||
    req.headers.authorization !== "Bearer local-browser-test-only"
  ) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    let body = "";
    for await (const part of req) {
      body += part;
      if (Buffer.byteLength(body) > 180_000) throw new Error("Too large");
    }
    const data = JSON.parse(JSON.parse(body).messages[1].content);
    if (data.client_conversation.startsWith("__retry__")) {
      const n = (attempts.get(data.client_conversation) ?? 0) + 1;
      attempts.set(data.client_conversation, n);
      if (n === 1) {
        res.writeHead(503);
        res.end();
        return;
      }
    }
    if (
      data.client_conversation === "__continue__" &&
      !data.previous_state?.formed?.includes(cases[0].conversation)
    ) {
      res.writeHead(400);
      res.end();
      return;
    }
    if (data.client_conversation === "__quota__") {
      res.writeHead(429);
      res.end("test quota error");
      return;
    }
    if (data.client_conversation === "__timeout__") {
      setTimeout(() => res.end("{}"), 2500);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    let result = cases.find(
      (f) => f.conversation === data.client_conversation,
    )?.mock_result;
    if (data.client_conversation === "__continue__")
      result = {
        ...cases[1].mock_result,
        formed: [...data.previous_state.formed, "__continue__"],
      };
    if (data.client_conversation.startsWith("__long__"))
      result = {
        ...cases[0].mock_result,
        formed: [],
        next_move: "Establish the remaining condition before proceeding. "
          .repeat(9)
          .trim(),
        send: "Thank you for sharing the context. ".repeat(68).trim(),
        why: "The available information needs clarification before an agreement. "
          .repeat(7)
          .trim(),
      };
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content:
                data.client_conversation === "__malformed__"
                  ? "bad JSON"
                  : JSON.stringify(
                      result ?? {
                        ...cases[0].mock_result,
                        formed: [data.client_conversation.slice(0, 500)],
                      },
                    ),
            },
          },
        ],
      }),
    );
  } catch {
    res.writeHead(400);
    res.end();
  }
});
server.listen(Number(process.env.FIXTURE_PORT ?? 3101), "127.0.0.1", () =>
  process.stdout.write("Local fixture provider ready\n"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
  });
