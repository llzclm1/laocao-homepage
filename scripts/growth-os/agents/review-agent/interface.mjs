const prohibited = [
  "supplier verification guarantee",
  "factory audit",
  "quality inspection",
  "payment protection",
  "supplier reliability guarantee"
];

export const agent = {
  name: "review-agent",
  input: ["docs/content-pipeline/<go-id>/draft.md"],
  output: ["docs/content-pipeline/<go-id>/review.md"],
  approval_required: true,
  prohibited
};

export function run() {
  return {
    agent: agent.name,
    status: "stub",
    decision: "needs_manual_review",
    approval_required: agent.approval_required,
    prohibited
  };
}
