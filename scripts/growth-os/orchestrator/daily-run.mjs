import { runDailyPipeline } from "./pipeline-runner.mjs";

const result = runDailyPipeline();

console.log("Growth OS Daily Run");
console.log(`Date: ${result.date}`);
console.log(`Processed opportunities: ${result.processedOpportunities}`);
console.log(`Generated drafts: ${result.generatedDrafts}`);
console.log(`Need review: ${result.needReview}`);
console.log(`Errors: ${result.errors.length ? result.errors.join("; ") : "none"}`);
