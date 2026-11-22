import assert from "node:assert/strict";

globalThis.fetch = async (url, request) => {
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  const body = JSON.parse(request.body);
  assert.equal(body.model, "claude-sonnet-4-6");
  assert.deepEqual(body.tool_choice, { type: "tool", name: "emit_translations" });
  assert.deepEqual(JSON.parse(body.messages[0].content.split("\n\nTranslate:\n")[1]), {
    hello: "Hello, {name}!",
  });
  return Response.json({
    content: [{ type: "tool_use", name: "emit_translations", input: { hello: "Hola, {name}!" } }],
    usage: { input_tokens: 80, output_tokens: 20 },
  });
};
