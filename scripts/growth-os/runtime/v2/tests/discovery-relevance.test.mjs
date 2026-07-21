import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { candidateFromItem, runV2Discovery } from '../discovery.mjs';
import { scoreDiscoveryItem } from '../discovery-relevance.mjs';
import { openV2Store } from '../store.mjs';

function item(overrides = {}) {
  return {
    platform: 'reddit',
    url: 'https://www.reddit.com/r/Alibaba/comments/abc123/supplier_question',
    canonical_url: 'https://www.reddit.com/r/Alibaba/comments/abc123/supplier_question',
    title: 'How do I source from a Chinese supplier?',
    snippet: 'I need MOQ, sample, quotation, payment and lead time guidance before placing an order.',
    source_name: 'reddit_rss:Alibaba',
    source_method: 'reddit_rss',
    author: 'buyer-question',
    ...overrides,
  };
}

test('strong China procurement question is kept and scored', () => {
  const result = scoreDiscoveryItem(item());
  assert.equal(result.category, 'A');
  assert.equal(result.decision, 'keep');
  assert.ok(result.score >= 80);
  assert.ok(result.signals.china.includes('chinese'));
  assert.ok(result.signals.procurement_context.includes('supplier'));
});

test('generic career, operations, AI news, help and policy records are rejected', () => {
  const cases = [
    {
      expected: 'C',
      value: item({ title: 'Career advice', snippet: 'What job should I take in operations?' }),
    },
    {
      expected: 'C',
      value: item({ title: 'What does Operations make you good at?', snippet: 'General operations discussion.' }),
    },
    {
      expected: 'C',
      value: item({ title: 'HubSpot Backtracks After Sharing Plans To Train AI On Customer Data', snippet: 'Company news about AI.' }),
    },
    {
      expected: 'D',
      value: item({ url: 'https://help.quora.com/hc/en-us/articles/1', canonical_url: 'https://help.quora.com/hc/en-us/articles/1', title: 'What is Quora Help Center policy?', snippet: 'Policy and FAQ.' }),
    },
    {
      expected: 'E',
      value: item({ author: 'AutoModerator', title: 'Monday: Career/Education Chat', snippet: 'Please use this pinned weekly thread.' }),
    },
  ];

  for (const testCase of cases) {
    assert.equal(scoreDiscoveryItem(testCase.value).category, testCase.expected);
    assert.equal(scoreDiscoveryItem(testCase.value).decision, 'reject');
  }
});

test('lead time without a buyer, supplier, order or China context is rejected', () => {
  const result = scoreDiscoveryItem(item({
    title: 'Seeking advice on this.',
    snippet: 'Lead time is often treated as one number: material availability, production scheduling, inspection and pickup. Looking at where the order waits is not a procurement question.',
    url: 'https://www.reddit.com/r/supplychain/comments/abc123/seeking_advice',
    canonical_url: 'https://www.reddit.com/r/supplychain/comments/abc123/seeking_advice',
    source_name: 'reddit_rss:supplychain',
  }));
  assert.equal(result.category, 'C');
  assert.equal(result.decision, 'reject');
  assert.ok(result.reasons.includes('missing_procurement_context'));
});

test('non HTTP(S) URLs are rejected before writing', () => {
  const result = scoreDiscoveryItem(item({ url: 'javascript:alert(1)', canonical_url: 'javascript:alert(1)' }));
  assert.equal(result.category, 'C');
  assert.equal(result.decision, 'reject');
  assert.deepEqual(result.reasons, ['non_http_url']);
});

test('Discovery filter blocks rejected items before the Single Writer', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'growth-os-v2-relevance-'));
  const dbPath = join(directory, 'v2.sqlite');
  try {
    const result = await runV2Discovery({
      dbPath,
      now: new Date('2026-07-21T10:00:00.000Z'),
      sourceResults: [{
        platform: 'reddit',
        source_name: 'test',
        collection_status: 'success',
        items: [
          item(),
          item({
            url: 'https://www.reddit.com/r/supplychain/comments/job123/career_advice',
            canonical_url: 'https://www.reddit.com/r/supplychain/comments/job123/career_advice',
            title: 'Career advice',
            snippet: 'I am looking for a job in operations.',
            author: 'job-seeker',
          }),
        ],
      }],
    });

    assert.equal(result.added.length, 1);
    assert.equal(result.rejected.length, 1);
    assert.equal(result.rejected[0].category, 'C');

    const store = openV2Store({ dbPath, rebuildView: false });
    try {
      assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM opportunities').get().count, 1);
      const evidence = JSON.parse(store.db.prepare('SELECT evidence_json FROM opportunities').get().evidence_json);
      assert.equal(evidence.relevance.relevance_decision, 'keep');
      assert.ok(evidence.relevance.relevance_score >= 80);
    } finally {
      store.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('candidate evidence persists relevance without changing lifecycle semantics', () => {
  const candidate = candidateFromItem(item(), new Date('2026-07-21T10:00:00.000Z'));
  assert.equal(candidate.relevance.decision, 'keep');
  assert.equal(candidate.evidence.relevance.relevance_score, candidate.relevance.score);
});
