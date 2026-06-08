import { createFileRoute } from "@tanstack/react-router";
import { SubmissionForm } from "@/components/submission-form";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Get support — Support Center" },
      { name: "description", content: "Ask a question or request help from our support team." },
    ],
  }),
  component: () => (
    <SubmissionForm
      type="support"
      title="Get support"
      description="Questions, how-tos, and account requests. We typically reply within two business days."
      extraFields={[
        {
          name: "topic",
          label: "Topic",
          type: "select",
          required: true,
          options: [
            { value: "how_to", label: "How do I…?" },
            { value: "account", label: "Account or licensing" },
            { value: "billing", label: "Billing" },
            { value: "feature_request", label: "Feature request" },
            { value: "other", label: "Other" },
          ],
        },
        {
          name: "message",
          label: "Details",
          type: "textarea",
          required: true,
          placeholder: "Share any extra context that would help us answer your question.",
        },
      ]}
    />
  ),
});