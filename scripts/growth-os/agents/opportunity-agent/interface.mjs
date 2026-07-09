export const agent = {
  name: "opportunity-agent",
  input: ["data/growth-os/source-questions.jsonl", "data/growth-os/opportunities.jsonl"],
  output: ["data/growth-os/opportunities.jsonl"],
  approval_required: true
};

export function run() {
  return {
    agent: agent.name,
    status: "stub",
    approval_required: agent.approval_required,
    next_action: "Provide local source questions before implementation."
  };
}
