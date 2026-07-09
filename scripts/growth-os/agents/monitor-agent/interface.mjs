export const agent = {
  name: "monitor-agent",
  input: ["data/growth-os/state/content-lifecycle.json", "docs/growth-os/monitoring/geo-monitoring.md"],
  output: ["docs/geo-monitoring/geo-report-YYYY-MM-weekN.md"],
  approval_required: false
};

export function run() {
  return {
    agent: agent.name,
    status: "stub",
    next_action: "Use local monitoring records to generate a report."
  };
}
