const BUYER_INTENT_PATTERNS = Object.freeze([
  ['buy', /\bbuy(?:ing|er|ers)?\b/i],
  ['source', /\bsourc(?:e|ed|ing)\b/i],
  ['supplier', /\bsupplier(?:s)?\b/i],
  ['manufacturer', /\bmanufacturer(?:s)?\b/i],
  ['factory', /\bfactor(?:y|ies)\b/i],
  ['wholesale', /\bwholesale\b/i],
  ['import', /\bimport(?:er|ing)?\b/i],
  ['alibaba', /\balibaba\b/i],
  ['1688', /\b1688\b/i],
  ['moq', /\bmoq\b|minimum order quantity/i],
  ['quotation', /\bquotation(?:s)?\b|\bquote(?:s|d)?\b/i],
  ['sample', /\bsample(?:s)?\b/i],
  ['order', /\b(?:purchase order|place(?:d|ing)? an? order|order(?:ing)? (?:from|samples?|goods?|products?|a factory|a supplier))\b/i],
  ['shipment', /\bshipment(?:s)?\b|\bshipping\b/i],
  ['freight', /\bfreight\b/i],
  ['payment', /\bpayment(?:s)?\b|\bdeposit\b/i],
  ['lead_time', /\blead[ -]?time\b/i],
  ['supplier_communication', /supplier communication|communicat(?:e|ing) with suppliers?/i],
  ['oem', /\boem\b/i],
  ['odm', /\bodm\b/i],
  ['tooling', /\btooling\b/i],
  ['mold', /\bmould?\b/i],
  ['production', /\bproduction\b/i],
  ['packaging', /\bpackaging\b/i],
  ['customization', /\bcustomi[sz]ation\b|custom(?:ized|ised|ize|ise)\b/i],
]);

const CHINA_PATTERNS = Object.freeze([
  ['china', /\bchina\b/i],
  ['chinese', /\bchinese\b/i],
  ['shenzhen', /\bshenzhen\b/i],
  ['guangzhou', /\bguangzhou\b/i],
  ['yiwu', /\byiwu\b/i],
  ['alibaba', /\balibaba\b/i],
  ['1688', /\b1688\b/i],
]);

const MANUFACTURING_PATTERNS = Object.freeze([
  ['oem', /\boem\b/i],
  ['odm', /\bodm\b/i],
  ['tooling', /\btooling\b/i],
  ['mold', /\bmould?\b/i],
  ['production', /\bproduction\b/i],
  ['packaging', /\bpackaging\b/i],
  ['customization', /\bcustomi[sz]ation\b|custom(?:ized|ised|ize|ise)\b/i],
  ['manufacturer', /\bmanufacturer(?:s)?\b/i],
  ['factory', /\bfactor(?:y|ies)\b/i],
]);

const PROCUREMENT_CONTEXT_PATTERNS = Object.freeze([
  ['buy', /\bbuy(?:ing|er|ers)?\b/i],
  ['source', /\bsourc(?:e|ed|ing)\b/i],
  ['supplier', /\bsupplier(?:s)?\b/i],
  ['manufacturer', /\bmanufacturer(?:s)?\b/i],
  ['factory', /\bfactor(?:y|ies)\b/i],
  ['wholesale', /\bwholesale\b/i],
  ['import', /\bimport(?:er|ing)?\b/i],
  ['alibaba', /\balibaba\b/i],
  ['1688', /\b1688\b/i],
  ['moq', /\bmoq\b|minimum order quantity/i],
  ['quotation', /\bquotation(?:s)?\b|\bquote(?:s|d)?\b/i],
  ['sample', /\bsample(?:s)?\b/i],
  ['order', /\b(?:purchase order|place(?:d|ing)? an? order|order(?:ing)? (?:from|samples?|goods?|products?|a factory|a supplier))\b/i],
  ['shipment', /\bshipment(?:s)?\b|\bshipping\b/i],
  ['freight', /\bfreight\b/i],
  ['payment', /\bpayment(?:s)?\b|\bdeposit\b/i],
  ['supplier_communication', /supplier communication|communicat(?:e|ing) with suppliers?/i],
  ['oem', /\boem\b/i],
  ['odm', /\bodm\b/i],
  ['customization', /\bcustomi[sz]ation\b|custom(?:ized|ised|ize|ise)\b/i],
  ['packaging', /\bpackaging\b/i],
]);

const HARD_AUTOMATED_PATTERNS = Object.freeze([
  ['automoderator', /automoderator|automated moderator/i],
  ['pinned_thread', /pinned(?: weekly)? thread|stickied thread/i],
  ['weekly_thread', /weekly discussion|weekly roundtable|weekly thread|monthly thread/i],
  ['megathread', /megathread/i],
  ['use_this_thread', /please use this thread|use this thread/i],
  ['subreddit_rules', /subreddit rules|community rules/i],
  ['thread_resets', /this thread automatically resets|automatically resets every/i],
]);

const SYSTEM_PAGE_PATTERNS = Object.freeze([
  ['help_center', /help center|help\.quora\.com|\bfaq\b/i],
  ['policy', /\bpolic(?:y|ies)\b|moderation policies|user policies/i],
  ['announcement', /\bannouncement\b|product announcement|platform announcement/i],
  ['rules', /\brules\b|guidelines|transparency/i],
]);

const CAREER_PATTERNS = Object.freeze([
  ['career', /\bcareer(?:s)?\b/i],
  ['job', /\bjob(?:s)?\b|hiring|laid off|referral/i],
  ['education', /\beducation\b|\bdegree\b|\buniversity\b|\bstudent\b/i],
  ['education_program', /\bcips\b|\bcscp\b|\bapics\b|course recommendations?|\bcertificate program\b/i],
  ['salary', /\bsalary\b|\bresume\b|\binterview\b/i],
]);

const NEWS_PATTERNS = Object.freeze([
  ['ai_news', /\bai\b|artificial intelligence|train ai on customer data/i],
  ['company_news', /backtracks after|\bearnings\b|\bfunding\b|\bacquisition\b|company-wide restructuring/i],
  ['news', /\bnews\b|announces? new|new peak season fees/i],
  ['marketing_or_saas', /\bmarketing\b|\bsaas\b|startup news/i],
]);

const QUESTION_PATTERNS = Object.freeze([
  /\?/i,
  /\bhow (?:do|can|should|to)\b/i,
  /\bwhat (?:is|are|should|do)\b/i,
  /\bwhich\b/i,
  /\banyone\b/i,
  /\blooking for\b|\bneed help\b|\bseeking advice\b/i,
]);

function decodeEntities(value) {
  return String(value || '')
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:quot|#34;)/gi, '"')
    .replace(/&(?:apos|#39;)/gi, "'")
    .replace(/&(?:nbsp|#160;)/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function text(value) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

function parseEvidence(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function urlContext(value) {
  try {
    const url = new URL(String(value || ''));
    const path = url.pathname.toLowerCase();
    const subreddit = path.match(/^\/r\/([^/]+)/i)?.[1]?.toLowerCase() || '';
    return {
      validHttp: url.protocol === 'http:' || url.protocol === 'https:',
      host: url.hostname.toLowerCase(),
      path,
      subreddit,
      text: `${url.hostname} ${url.pathname}`,
    };
  } catch {
    return { validHttp: false, host: '', path: '', subreddit: '', text: '' };
  }
}

function hits(textValue, patterns) {
  return patterns.filter(([, pattern]) => pattern.test(textValue)).map(([name]) => name);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function bandFor(score) {
  if (score >= 80) return '80-100';
  if (score >= 60) return '60-79';
  if (score >= 40) return '40-59';
  return '0-39';
}

function categoryFor(score) {
  if (score >= 80) return 'A';
  if (score >= 40) return 'B';
  return 'C';
}

function categoryLabel(category) {
  return {
    A: 'strongly_relevant',
    B: 'possibly_relevant',
    C: 'irrelevant',
    D: 'system_policy',
    E: 'automated_pinned',
  }[category];
}

export function scoreDiscoveryItem(input = {}) {
  const evidence = parseEvidence(input.evidence_json ?? input.evidence);
  const sourceUrl = input.source_url ?? input.canonical_url ?? input.url;
  const title = text(input.title ?? input.raw_topic);
  const body = text(input.body ?? input.snippet ?? input.description);
  const url = urlContext(sourceUrl);
  const author = text(input.author ?? evidence.author);
  const sourceName = text(input.source_name ?? evidence.source_name ?? evidence.source);
  const subreddit = url.subreddit || sourceName.match(/reddit[^:]*:?([^/\s]+)/i)?.[1]?.toLowerCase() || '';
  const content = text(`${title} ${body}`);
  const combined = text(`${content} ${url.text} ${subreddit} ${author} ${sourceName}`);

  if (!url.validHttp) {
    return {
      category: 'C',
      category_label: categoryLabel('C'),
      band: '0-39',
      score: 0,
      decision: 'reject',
      reasons: ['non_http_url'],
      signals: { buyer_intent: [], china: [], manufacturing: [] },
    };
  }

  const automatedHits = hits(combined, HARD_AUTOMATED_PATTERNS);
  if (author && /automoderator|automated moderator/i.test(author)) {
    automatedHits.push('author_automoderator');
  }
  if (automatedHits.length) {
    return {
      category: 'E',
      category_label: categoryLabel('E'),
      band: '0-39',
      score: 0,
      decision: 'reject',
      reasons: [...new Set(automatedHits)],
      signals: { buyer_intent: [], china: [], manufacturing: [] },
    };
  }

  const systemHits = hits(combined, SYSTEM_PAGE_PATTERNS);
  if (systemHits.length || /^(help\.|support\.)/.test(url.host)) {
    return {
      category: 'D',
      category_label: categoryLabel('D'),
      band: '0-39',
      score: 0,
      decision: 'reject',
      reasons: [...new Set([...systemHits, 'system_page'])],
      signals: { buyer_intent: [], china: [], manufacturing: [] },
    };
  }

  const buyerIntent = hits(content, BUYER_INTENT_PATTERNS);
  const china = hits(combined, CHINA_PATTERNS);
  const manufacturing = hits(combined, MANUFACTURING_PATTERNS);
  const procurementContext = hits(content, PROCUREMENT_CONTEXT_PATTERNS);
  const careerHits = hits(content, CAREER_PATTERNS);
  const newsHits = hits(content, NEWS_PATTERNS);
  const question = QUESTION_PATTERNS.some((pattern) => pattern.test(content));
  const targetSubreddit = /^(alibaba|smallbusiness|entrepreneur|fulfillmentbamazon|ecommerce)$/.test(subreddit);

  let score = 0;
  score += procurementContext.length ? Math.min(40, 15 + procurementContext.length * 10) : 0;
  score += china.length ? 25 : 0;
  score += manufacturing.length ? 20 : 0;
  score += question ? 15 : 0;
  score += targetSubreddit ? 5 : 0;
  score += Math.min(15, new Set([...china, ...manufacturing]).size * 5);
  score = clamp(score);

  const reasons = [];
  if (!buyerIntent.length) reasons.push('missing_buyer_intent');
  if (!china.length && !manufacturing.length) reasons.push('missing_china_or_manufacturing_signal');
  if (!procurementContext.length) reasons.push('missing_procurement_context');
  if (careerHits.length) reasons.push(...careerHits.map((value) => `career_or_education:${value}`));
  if (newsHits.length) reasons.push(...newsHits.map((value) => `news_or_company:${value}`));
  if (/\boperations?\b/i.test(combined) && procurementContext.length <= 1) {
    reasons.push('general_operations_without_buyer_context');
  }

  const hardNews = newsHits.length && (!question || !procurementContext.length);
  const hardCareer = careerHits.length > 0;
  const passesRequiredSignals = buyerIntent.length > 0
    && (china.length > 0 || manufacturing.length > 0)
    && procurementContext.length > 0;

  if (hardNews || hardCareer || !passesRequiredSignals) {
    score = Math.min(score, 39);
  }

  const category = categoryFor(score);
  const decision = category === 'A' || (category === 'B' && score >= 60)
    ? 'keep'
    : category === 'B'
      ? 'manual_review'
      : 'reject';

  if (decision === 'keep' && reasons.length === 0) reasons.push('required_procurement_signals_present');
  return {
    category,
    category_label: categoryLabel(category),
    band: bandFor(score),
    score,
    decision,
    reasons: [...new Set(reasons)],
    signals: {
      buyer_intent: buyerIntent,
      china,
      manufacturing,
      procurement_context: procurementContext,
      question,
      subreddit,
    },
  };
}

export function relevanceEvidence(evaluation) {
  return {
    relevance_score: evaluation.score,
    relevance_band: evaluation.band,
    relevance_category: evaluation.category,
    relevance_decision: evaluation.decision,
    relevance_reasons: evaluation.reasons,
    relevance_signals: evaluation.signals,
  };
}
