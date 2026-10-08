import { createFileRoute } from "@tanstack/react-router";
import { serveLLMs } from "../lib/llms.server";

export const Route = createFileRoute("/api/llms-markdown")({
  server: { handlers: { GET: ({ request }) => serveLLMs(request, "page") } },
});
