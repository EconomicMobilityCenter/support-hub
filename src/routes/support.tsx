import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/support")({
  beforeLoad: () => {
    throw redirect({ to: "/get-help" });
  },
});