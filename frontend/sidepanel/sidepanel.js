// ============================================================
//  ClickSafe — sidepanel.js  (v1.4.0 — exposure-based scoring)
// ============================================================

const CIRCUMFERENCE = 175.9;

// ── Company recognition map ──────────────────────────────────
// Maps known tracker domains → { name, tier, what }
// tier 1 = big surveillance, tier 2 = ad networks, tier 3 = analytics
const COMPANY_MAP = {
  // Tier 1 — big surveillance
  "google":           { name: "Google",           tier: 1, what: "tracking your browsing history across the web" },
  "googletagmanager": { name: "Google",           tier: 1, what: "tracking your browsing history across the web" },
  "googleanalytics":  { name: "Google",           tier: 1, what: "tracking your browsing history across the web" },
  "googlesyndication":{ name: "Google",           tier: 1, what: "serving targeted ads based on your profile" },
  "doubleclick":      { name: "Google (DoubleClick)", tier: 1, what: "building an ad profile on you" },
  "gstatic":          { name: "Google",           tier: 1, what: "loading Google tracking resources" },
  "facebook":         { name: "Meta / Facebook",  tier: 1, what: "tracking you even when you're not on Facebook" },
  "connect.facebook": { name: "Meta / Facebook",  tier: 1, what: "tracking you even when you're not on Facebook" },
  "instagram":        { name: "Meta / Instagram", tier: 1, what: "tracking your activity across sites" },
  "tiktok":           { name: "TikTok",           tier: 1, what: "tracking your browsing behavior" },
  "bytedance":        { name: "TikTok (ByteDance)", tier: 1, what: "tracking your browsing behavior" },
  "microsoft":        { name: "Microsoft",        tier: 1, what: "tracking your activity for advertising" },
  "bing":             { name: "Microsoft (Bing)", tier: 1, what: "tracking your search and browsing activity" },
  "amazon":           { name: "Amazon",           tier: 1, what: "tracking your shopping behavior" },
  "amazon-adsystem":  { name: "Amazon Ads",       tier: 1, what: "building a shopping profile on you" },
  "adobe":            { name: "Adobe",            tier: 1, what: "tracking your behavior for analytics" },
  "demdex":           { name: "Adobe (Audience Manager)", tier: 1, what: "building a cross-site profile on you" },
  "oracle":           { name: "Oracle",           tier: 1, what: "collecting your data for a profile database" },
  "bluekai":          { name: "Oracle (BlueKai)", tier: 1, what: "selling your profile data to advertisers" },
  "salesforce":       { name: "Salesforce",       tier: 1, what: "tracking your behavior for marketing" },
  "krux":             { name: "Salesforce (Krux)", tier: 1, what: "building an audience profile on you" },
  "twitter":          { name: "X / Twitter",      tier: 1, what: "tracking your activity off-platform" },
  "linkedin":         { name: "LinkedIn",         tier: 1, what: "tracking your professional browsing habits" },
  "snapchat":         { name: "Snapchat",         tier: 1, what: "tracking you outside their app" },

  // Tier 2 — ad networks
  "criteo":           { name: "Criteo",           tier: 2, what: "retargeting you with ads based on your history" },
  "taboola":          { name: "Taboola",          tier: 2, what: "tracking you for sponsored content targeting" },
  "outbrain":         { name: "Outbrain",         tier: 2, what: "tracking you for sponsored content targeting" },
  "appnexus":         { name: "Xandr (AppNexus)", tier: 2, what: "running real-time ad auctions using your data" },
  "rubiconproject":   { name: "Magnite",          tier: 2, what: "auctioning your attention to advertisers" },
  "pubmatic":         { name: "PubMatic",         tier: 2, what: "selling ad impressions using your profile" },
  "openx":            { name: "OpenX",            tier: 2, what: "running ad auctions using your data" },
  "mediamath":        { name: "MediaMath",        tier: 2, what: "targeting ads based on your behavior" },
  "quantcast":        { name: "Quantcast",        tier: 2, what: "profiling your interests for advertisers" },
  "adroll":           { name: "AdRoll",           tier: 2, what: "retargeting you with ads across sites" },
  "33across":         { name: "33Across",         tier: 2, what: "tracking you for cross-site ad targeting" },
  "smartadserver":    { name: "Smart AdServer",   tier: 2, what: "serving targeted ads using your data" },
  "sharethrough":     { name: "Sharethrough",     tier: 2, what: "running native ad auctions on your data" },
  "spotxchange":      { name: "SpotX",            tier: 2, what: "tracking you for video ad targeting" },
  "conversant":       { name: "Conversant",       tier: 2, what: "building a purchase intent profile on you" },
  "lotame":           { name: "Lotame",           tier: 2, what: "selling your audience data to advertisers" },

  // Tier 3 — analytics
  "hotjar":           { name: "Hotjar",           tier: 3, what: "recording your clicks and scrolls on this page" },
  "mixpanel":         { name: "Mixpanel",         tier: 3, what: "tracking how you use this site" },
  "amplitude":        { name: "Amplitude",        tier: 3, what: "tracking how you use this site" },
  "segment":          { name: "Segment",          tier: 3, what: "collecting your usage data for the site owner" },
  "heap":             { name: "Heap",             tier: 3, what: "recording your interactions on this page" },
  "fullstory":        { name: "FullStory",        tier: 3, what: "recording your session on this page" },
  "mouseflow":        { name: "Mouseflow",        tier: 3, what: "recording your mouse movements" },
  "clarity":          { name: "Microsoft Clarity", tier: 3, what: "recording your session on this page" },
  "intercom":         { name: "Intercom",         tier: 3, what: "tracking your activity for support purposes" },
  "zendesk":          { name: "Zendesk",          tier: 3, what: "tracking your activity for support purposes" },
};

const TIER_LABELS = { 1: "High risk", 2: "Ad network", 3: "Analytics" };
const TIER_CLASSES = { 1: "tier-1", 2: "tier-2", 3: "tier-3" };
const TIER_SCORE   = { 1: 15, 2: 8, 3: 3 };
const TIER_MAX     = { 1: 45, 2: 24, 3:  9 };

// ── Scoring ──────────────────────────────────────────────────
function computePrivacyScore({ isHttps, mixedContent, companies }) {
  let score = 100;

  if (!isHttps) score -= 15;
  if (mixedContent > 0) score -= 5;

  const byTier = { 1: 0, 2: 0, 3: 0 };
  companies.forEach(c => { if (byTier[c.tier] !== undefined) byTier[c.tier]++; });

  [1, 2, 3].forEach(t => {
    score -= Math.min(byTier[t] * TIER_SCORE[t], TIER_MAX[t]);
  });

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Domain → company lookup ───────────────────────────────────
function domainToCompany(domain) {
  if (!domain) return null;
  const d = domain.toLowerCase().replace(/^www\./, "");
  for (const key of Object.keys(COMPANY_MAP)) {
    if (d.includes(key)) return { domain, ...COMPANY_MAP[key] };
  }
  // Unknown tracker — tier 2 by default
  const name = d.split(".").slice(-2, -1)[0];
  return {
    domain,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    tier: 2,
    what: "tracking your activity on this page"
  };
}

// ── Deduplicate companies by name ─────────────────────────────
function extractCompanies(trackerDomains) {
  const seen = new Map();
  trackerDomains.forEach(domain => {
    const c = domainToCompany(domain);
    if (!c) return;
    if (!seen.has(c.name)) seen.set(c.name, c);
  });
  return Array.from(seen.values()).sort((a, b) => a.tier - b.tier);
}

// ── Messaging ────────────────────────────────────────────────
chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATS" }, response => {
  if (chrome.runtime.lastError) return;
  if (response) render(response);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "PANEL_UPDATE") render(message.payload);
});

// ── Session company tracking ──────────────────────────────────
let sessionCompanyNames = new Set();

// ── Main render ───────────────────────────────────────────────
function render(payload) {
  if (!payload) return;

  const {
    url = "",
    isHttps = false,
    pageTrackerCount        = 0,
    pageTrackerScripts      = [],
    pageMixedCount          = 0,
    cookieData              = {},
    linksChecked            = 0,
    totalTrackersFound      = 0,
    totalLinksChecked       = 0,
    totalCookieTrackersFound = 0,
  } = payload;

  // URL & connection
  setText("page-url", url || "—");
  const badge = document.getElementById("conn-badge");
  if (badge) {
    badge.textContent = "";
    const dot = document.createElement("span");
    dot.className = "conn-dot";
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(" " + (isHttps ? "Secure (HTTPS)" : "Not Secure (HTTP)")));
    badge.className = "conn-badge " + (isHttps ? "secure" : "insecure");
  }

  // Gather all tracker domains from scripts + cookies
  const trackerDomains = [
    ...(pageTrackerScripts || []).map(t => t.tracker || t.domain || ""),
    ...((cookieData.trackers || []).map(t => t.cookie?.domain || ""))
  ].filter(Boolean);

  const companies = extractCompanies(trackerDomains);

  // Update session set
  companies.forEach(c => sessionCompanyNames.add(c.name));

  // Score
  const score = computePrivacyScore({ isHttps, mixedContent: pageMixedCount, companies });
  renderGauge(score, companies, isHttps, pageMixedCount);

  // Company list
  renderCompanyList(companies);

  // Stats
  setText("stat-companies",      companies.length);
  setText("stat-trackers",       pageTrackerCount);
  setText("stat-cookie-trackers", cookieData.trackingCookies || 0);
  setText("stat-mixed",          pageMixedCount);

  // Session
  setText("stat-total-companies",      sessionCompanyNames.size);
  setText("stat-total-trackers",       totalTrackersFound);
  setText("stat-total-cookie-trackers", totalCookieTrackersFound);
  setText("stat-total-links",          totalLinksChecked);
}

// ── Gauge ─────────────────────────────────────────────────────
function renderGauge(score, companies, isHttps, mixedContent) {
  const arc     = document.getElementById("ring-arc");
  const number  = document.getElementById("ring-number");
  const verdict = document.getElementById("score-verdict");
  const plain   = document.getElementById("score-plain");
  if (!arc) return;

  arc.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);

  let color, label, description;

  if (score >= 85) {
    color = "#16a34a";
    label = "Minimal tracking";
    description = "This page has very little tracking. You're mostly in the clear.";
  } else if (score >= 65) {
    color = "#2563eb";
    label = "Some tracking";
    const names = companies.slice(0, 2).map(c => c.name).join(" and ");
    description = names
      ? `${names} ${companies.length > 1 ? "are" : "is"} watching your activity on this page.`
      : "A few trackers were found on this page.";
  } else if (score >= 40) {
    color = "#d97706";
    label = "You're being tracked";
    const tier1 = companies.filter(c => c.tier === 1);
    description = tier1.length
      ? `${tier1.map(c => c.name).join(", ")} ${tier1.length > 1 ? "are" : "is"} building a profile on you.`
      : `${companies.length} companies are collecting your data on this page.`;
  } else {
    color = "#dc2626";
    label = "Heavily surveilled";
    const tier1 = companies.filter(c => c.tier === 1);
    description = tier1.length
      ? `This page is loaded with surveillance. ${tier1.map(c => c.name).join(", ")} and others know you were here.`
      : `${companies.length} trackers found — this page is heavily monitored.`;
  }

  if (!isHttps) {
    description += " Your connection is also unencrypted (HTTP).";
  }

  arc.style.stroke    = color;
  number.textContent  = score;
  number.style.color  = color;
  verdict.textContent = label;
  verdict.style.color = color;
  plain.textContent   = description;
}

// ── Company list ──────────────────────────────────────────────
function renderCompanyList(companies) {
  const list = document.getElementById("company-list");
  if (!list) return;

  if (companies.length === 0) {
    list.innerHTML = `
      <div class="no-trackers">
        <span class="no-trackers-icon">✓</span>
        No trackers detected on this page
      </div>`;
    return;
  }

  list.innerHTML = companies.map(c => {
    const initials = c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const tierLabel = TIER_LABELS[c.tier] || "Tracker";
    const tierClass = TIER_CLASSES[c.tier] || "tier-2";
    return `
      <div class="company-card">
        <div class="company-logo">${initials}</div>
        <div class="company-info">
          <div class="company-name">${c.name}</div>
          <div class="company-action">${c.what}</div>
        </div>
        <span class="company-tier ${tierClass}">${tierLabel}</span>
      </div>`;
  }).join("");
}

// ── Helpers ───────────────────────────────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
