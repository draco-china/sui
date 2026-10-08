import { createFileRoute } from "@tanstack/react-router";
import { serveLLMs } from "../lib/llms.server";

export const Route = createFileRoute("/{-$lang}/llms.txt")({
  server: {
    handlers: {
      GET: ({ request, params }) => serveLLMs(request, "index", params.lang),
    },
  },
});
