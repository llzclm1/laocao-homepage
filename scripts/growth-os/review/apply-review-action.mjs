import { applyReviewActionToState, nextReviewStatus } from "../state/state-manager.mjs";

export { nextReviewStatus };

export function applyReviewAction(action, { now = new Date(), writeHistory = true } = {}) {
  const transition = applyReviewActionToState(action, { now, writeHistory });
  return {
    ...transition,
    to_cn: chineseStatus(transition.to),
    next: transition.to === "approved" ? "进入发布队列" : "等待下一步处理"
  };
}

function chineseStatus(status) {
  return {
    draft_ready: "草稿完成",
    review_pending: "待审核",
    approved: "已批准",
    publish_ready: "待发布",
    rejected: "已拒绝",
    revision_required: "需要修改",
    published: "已发布",
    monitoring: "监测中",
    learning: "学习反馈"
  }[status] || status;
}

function selfCheck() {
  console.assert(nextReviewStatus("review_pending", "approve") === "approved");
  console.assert(nextReviewStatus("review_pending", "reject") === "rejected");
  console.assert(nextReviewStatus("review_pending", "revision") === "revision_required");
  console.assert(nextReviewStatus("approved", "revision") === "approved");
}

if (process.argv.includes("--self-check")) {
  selfCheck();
  console.log("apply-review-action self-check ok");
}
