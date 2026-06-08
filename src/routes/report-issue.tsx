import { createFileRoute } from "@tanstack/react-router";
import { SubmissionForm } from "@/components/submission-form";

export const Route = createFileRoute("/report-issue")({
  head: () => ({
    meta: [
      { title: "Report an issue — EMC Support" },
      { name: "description", content: "Report a bug or unexpected behavior in our products." },
    ],
  }),
  component: () => (
    <SubmissionForm
      type="issue"
      title="Report an issue"
      description="Tell us what went wrong. The more detail you can give, the faster we can help."
      extraFields={[
        {
          name: "severity",
          label: "Severity",
          type: "select",
          required: true,
          options: [
            { value: "low", label: "Low — minor inconvenience" },
            { value: "medium", label: "Medium — affects my work" },
            { value: "high", label: "High — blocking" },
            { value: "critical", label: "Critical — affects whole team" },
          ],
        },
        {
          name: "steps",
          label: "Steps to reproduce",
          type: "textarea",
          required: true,
          placeholder: "1. Open …\n2. Click …\n3. …",
        },
        {
          name: "expected_vs_actual",
          label: "Expected vs actual result",
          type: "textarea",
          placeholder: "I expected … but instead …",
        },
        {
          name: "attachment_links",
          label: "Attachment links (screenshots, files)",
          placeholder: "Paste shareable links (Drive, OneDrive, etc.)",
        },
      ]}
    />
  ),
});