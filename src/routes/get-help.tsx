import { createFileRoute } from "@tanstack/react-router";
import { GetHelpForm } from "@/components/get-help-form";

export const Route = createFileRoute("/get-help")({
  head: () => ({
    meta: [
      { title: "Get Help — EMC Support" },
      {
        name: "description",
        content:
          "Ask a question, report a missing report, or flag a data issue with our team.",
      },
    ],
  }),
  component: () => <GetHelpForm />,
});