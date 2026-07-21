import { readUnifiedView } from './store.mjs';

export function readReviewQueue(db) {
  const items = readUnifiedView(db).filter(
    (row) => row.current_status === 'pending_review',
  );
  return { count: items.length, items };
}

export function readReadyToPublish(db) {
  const items = readUnifiedView(db).filter(
    (row) => row.current_status === 'ready_to_publish',
  );
  return { count: items.length, items };
}
