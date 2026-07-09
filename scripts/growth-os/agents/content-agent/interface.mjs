export const agent = {
  name: "content-agent",
  input: ["docs/content-pipeline/<go-id>/opportunity.md"],
  output: [
    "docs/content-pipeline/<go-id>/brief.md",
    "docs/content-pipeline/<go-id>/draft.md",
    "docs/content-pipeline/<go-id>/schema-plan.md",
    "docs/content-pipeline/<go-id>/distribution.md",
    "docs/content-pipeline/<go-id>/geo-monitoring.md"
  ],
  approval_required: true
};

export function run(opportunityId) {
  return {
    agent: agent.name,
    opportunity_id: opportunityId || null,
    status: "stub",
    approval_required: agent.approval_required,
    next_action: "Generate drafts only after opportunity approval."
  };
}
