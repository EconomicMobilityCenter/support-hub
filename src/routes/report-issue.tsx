import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/report-issue")({
  beforeLoad: () => {
    throw redirect({ to: "/get-help" });
  },
});