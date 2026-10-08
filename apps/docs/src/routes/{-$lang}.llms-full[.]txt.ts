import { createFileRoute } from "@tanstack/react-router";
import { serveLLMs } from "../lib/llms.server";

export const Route = createFileRoute("/{-$lang}/llms-full.txt")({
  server: {
    handlers: {
      GET: ({ request, params }) => serveLLMs(request, "full", params.lang),
    },
  },
});
