export const agent = {
  name: "research-agent",
  input: ["data/growth-os/opportunities.jsonl"],
  output: ["docs/content-pipeline/<go-id>/opportunity.md"],
  approval_required: true
};

export function run(opportunityId) {
  return {
    agent: agent.name,
    opportunity_id: opportunityId || null,
    status: "stub",
    approval_required: agent.approval_required,
    next_action: "Add local research notes before content generation."
  };
}
