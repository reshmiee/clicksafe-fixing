// ============================================================
//  ClickSafe — sidepanel.js  (v1.4.0)
// ============================================================

const CIRCUMFERENCE = 188.5;

// ── Company map ───────────────────────────────────────────────
const COMPANY_MAP = {
  "google":            { name: "Google",                tier: 1, what: "tracking your browsing history across the web" },
  "googletagmanager":  { name: "Google",                tier: 1, what: "tracking your browsing history across the web" },
  "googleanalytics":   { name: "Google",                tier: 1, what: "tracking your browsing history across the web" },
  "googlesyndication": { name: "Google",                tier: 1, what: "serving targeted ads based on your profile" },
  "doubleclick":       { name: "Google (DoubleClick)",  tier: 1, what: "building an ad profile on you" },
  "gstatic":           { name: "Google",                tier: 1, what: "loading Google tracking resources" },
  "facebook":          { name: "Meta / Facebook",       tier: 1, what: "tracking you even when you're not on Facebook" },
  "instagram":         { name: "Meta / Instagram",      tier: 1, what: "tracking your activity across sites" },
  "tiktok":            { name: "TikTok",                tier: 1, what: "tracking your browsing behavior" },
  "bytedance":         { name: "TikTok (ByteDance)",    tier: 1, what: "tracking your browsing behavior" },
  "microsoft":         { name: "Microsoft",             tier: 1, what: "tracking your activity for advertising" },
  "bing":              { name: "Microsoft (Bing)",      tier: 1, what: "tracking your search and browsing activity" },
  "amazon-adsystem":   { name: "Amazon Ads",            tier: 1, what: "building a shopping profile on you" },
  "amazon":            { name: "Amazon",                tier: 1, what: "tracking your shopping behavior" },
  "adobe":             { name: "Adobe",                 tier: 1, what: "tracking your behavior for analytics" },
  "demdex":            { name: "Adobe (Audience Mgr)",  tier: 1, what: "building a cross-site profile on you" },
  "oracle":            { name: "Oracle",                tier: 1, what: "collecting your data for a profile database" },
  "bluekai":           { name: "Oracle (BlueKai)",      tier: 1, what: "selling your profile data to advertisers" },
  "salesforce":        { name: "Salesforce",            tier: 1, what: "tracking your behavior for marketing" },
  "krux":              { name: "Salesforce (Krux)",     tier: 1, what: "building an audience profile on you" },
  "twitter":           { name: "X / Twitter",           tier: 1, what: "tracking your activity off-platform" },
  "linkedin":          { name: "LinkedIn",              tier: 1, what: "tracking your professional browsing habits" },
  "snapchat":          { name: "Snapchat",              tier: 1, what: "tracking you outside their app" },
  "criteo":            { name: "Criteo",                tier: 2, what: "retargeting you with ads based on your history" },
  "taboola":           { name: "Taboola",               tier: 2, what: "tracking you for sponsored content targeting" },
  "outbrain":          { name: "Outbrain",              tier: 2, what: "tracking you for sponsored content targeting" },
  "appnexus":          { name: "Xandr (AppNexus)",      tier: 2, what: "running real-time ad auctions using your data" },
  "rubiconproject":    { name: "Magnite",               tier: 2, what: "auctioning your attention to advertisers" },
  "pubmatic":          { name: "PubMatic",              tier: 2, what: "selling ad impressions using your profile" },
  "openx":             { name: "OpenX",                 tier: 2, what: "running ad auctions using your data" },
  "quantcast":         { name: "Quantcast",             tier: 2, what: "profiling your interests for advertisers" },
  "adroll":            { name: "AdRoll",                tier: 2, what: "retargeting you with ads across sites" },
  "33across":          { name: "33Across",              tier: 2, what: "tracking you for cross-site ad targeting" },
  "lotame":            { name: "Lotame",                tier: 2, what: "selling your audience data to advertisers" },
  "hotjar":            { name: "Hotjar",                tier: 3, what: "recording your clicks and scrolls on this page" },
  "mixpanel":          { name: "Mixpanel",              tier: 3, what: "tracking how you use this site" },
  "amplitude":         { name: "Amplitude",             tier: 3, what: "tracking how you use this site" },
  "segment":           { name: "Segment",               tier: 3, what: "collecting your usage data for the site owner" },
  "heap":              { name: "Heap",                  tier: 3, what: "recording your interactions on this page" },
  "fullstory":         { name: "FullStory",             tier: 3, what: "recording your session on this page" },
  "mouseflow":         { name: "Mouseflow",             tier: 3, what: "recording your mouse movements" },
  "clarity":           { name: "Microsoft Clarity",     tier: 3, what: "recording your session on this page" },
  "intercom":          { name: "Intercom",              tier: 3, what: "tracking your activity for support purposes" },
  "zendesk":           { name: "Zendesk",               tier: 3, what: "tracking your activity for support purposes" },
};

const TIER_LABELS  = { 1: "High risk",   2: "Ad network", 3: "Analytics" };
const TIER_SCORE   = { 1: 15, 2: 8, 3: 3 };
const TIER_MAX     = { 1: 45, 2: 24, 3: 9 };

// ── Score ─────────────────────────────────────────────────────
function computeScore({ isHttps, mixedContent, companies }) {
  let score = 100;
  if (!isHttps)      score -= 15;
  if (mixedContent > 0) score -= 5;
  const byTier = { 1: 0, 2: 0, 3: 0 };
  companies.forEach(c => { if (byTier[c.tier] !== undefined) byTier[c.tier]++; });
  [1, 2, 3].forEach(t => {
    score -= Math.min(byTier[t] * TIER_SCORE[t], TIER_MAX[t]);
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Domain → company ──────────────────────────────────────────
function domainToCompany(domain) {
  if (!domain) return null;
  const d = domain.toLowerCase().replace(/^www\./, "");
  for (const key of Object.keys(COMPANY_MAP)) {
    if (d.includes(key)) return { domain, ...COMPANY_MAP[key] };
  }
  const name = d.split(".").slice(-2, -1)[0] || d;
  return {
    domain,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    tier: 2,
    what: "tracking your activity on this page"
  };
}

function extractCompanies(domains) {
  const seen = new Map();
  domains.forEach(domain => {
    const c = domainToCompany(domain);
    if (c && !seen.has(c.name)) seen.set(c.name, c);
  });
  return Array.from(seen.values()).sort((a, b) => a.tier - b.tier);
}

// ── Messaging ─────────────────────────────────────────────────
chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATS" }, response => {
  if (chrome.runtime.lastError) return;
  if (response) render(response);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "PANEL_UPDATE") render(message.payload);
});

let sessionCompanyNames = new Set();
let sessionPageCount = 0;

// ── Streak bar ────────────────────────────────────────────────
function updateStreakBar(count) {
  const label = document.getElementById("streak-label");
  if (label) label.textContent = `${count} page${count !== 1 ? "s" : ""} scanned`;
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`s${i}`);
    if (!el) continue;
    el.className = "streak-item" + (i < count ? " done" : i === count ? " active" : "");
  }
}

// ── Render ────────────────────────────────────────────────────
function render(payload) {
  if (!payload) return;

  const {
    url = "",
    isHttps = false,
    pageTrackerCount         = 0,
    pageTrackerScripts       = [],
    pageMixedCount           = 0,
    cookieData               = {},
    totalTrackersFound       = 0,
    totalLinksChecked        = 0,
    totalCookieTrackersFound = 0,
  } = payload;

  setText("page-url", url || "—");

  const pill = document.getElementById("conn-pill");
  if (pill) {
    pill.innerHTML = `<span class="conn-dot"></span> ${isHttps ? "Secure (HTTPS)" : "Not Secure (HTTP)"}`;
    pill.className = "header-conn-pill " + (isHttps ? "secure" : "insecure");
  }

  const trackerDomains = [
    ...(pageTrackerScripts || []).map(t => t.tracker || t.domain || ""),
    ...((cookieData.trackers || []).map(t => t.cookie?.domain || ""))
  ].filter(Boolean);

  const companies = extractCompanies(trackerDomains);
  const isNewPage = !sessionCompanyNames._lastUrl || sessionCompanyNames._lastUrl !== url;
  if (isNewPage && url) {
    sessionPageCount = Math.min(sessionPageCount + 1, 7);
    sessionCompanyNames._lastUrl = url;
  }
  companies.forEach(c => sessionCompanyNames.add(c.name));
  updateStreakBar(sessionPageCount);

  const score = computeScore({ isHttps, mixedContent: pageMixedCount, companies });

  renderGauge(score, companies, isHttps, pageMixedCount);
  renderCompanyList(companies);
  renderBackFace(pageTrackerScripts, cookieData);

  setText("stat-companies",       companies.length);
  setText("stat-trackers",        pageTrackerCount);
  setText("stat-cookie-trackers", cookieData.trackingCookies || 0);
  setText("stat-mixed",           pageMixedCount);

  setText("stat-total-companies",      sessionCompanyNames.size);
  setText("stat-total-trackers",       totalTrackersFound);
  setText("stat-total-cookie-trackers", totalCookieTrackersFound);
  setText("stat-total-links",          totalLinksChecked);
}

// ── Gauge ─────────────────────────────────────────────────────
function renderGauge(score, companies, isHttps, mixedContent) {
  const arc     = document.getElementById("ring-arc");
  const num     = document.getElementById("ring-num");
  const verdict = document.getElementById("score-verdict");
  const plain   = document.getElementById("score-plain");
  if (!arc) return;

  let color, label, desc;

  const t1 = companies.filter(c => c.tier === 1).length;
  const t2 = companies.filter(c => c.tier === 2).length;
  const t3 = companies.filter(c => c.tier === 3).length;
  const total = companies.length;

  if (score >= 85) {
    color = "#46A302";
    label = "You're safe here";
    desc  = total === 0
      ? "No trackers found. This page isn't collecting your data."
      : "Very little tracking on this page. Nothing to worry about.";
  } else if (score >= 65) {
    color = "#1E3A8A";
    label = "Some tracking";
    desc  = `This page has ${total} tracker${total !== 1 ? "s" : ""} — mostly for analytics. Your data is being collected but it's low risk.`;
  } else if (score >= 40) {
    color = "#CC7700";
    label = "You're being tracked";
    desc  = `${t1 > 0 ? `${t1} high-risk tracker${t1 !== 1 ? "s are" : " is"} building an ad profile on you. ` : ""}${t2 > 0 ? `${t2} ad network${t2 !== 1 ? "s are" : " is"} targeting you. ` : ""}Browse carefully.`;
  } else {
    color = "#CC2020";
    label = "Heavily surveilled";
    desc  = `This page has ${total} trackers — ${t1} high-risk. Your browsing behavior, interests, and identity are likely being recorded and sold.`;
  }

  if (!isHttps) desc += !isHttps && score < 85 ? " Your connection is also unencrypted." : " Also, your connection is unencrypted — avoid entering any personal info.";

  // Set color immediately (before transition) so the animation sweeps in the right color
  arc.style.transition = "none";
  arc.style.stroke = color;
  arc.style.strokeDashoffset = CIRCUMFERENCE;
  // Force reflow so the transition fires from offset=full (empty) to the target
  arc.getBoundingClientRect();
  arc.style.transition = "";
  arc.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);

  num.textContent     = score;
  num.style.color     = color;
  verdict.textContent = label;
  verdict.style.color = color;
  plain.textContent   = desc;
}

// ── Company list ──────────────────────────────────────────────
function renderCompanyList(companies) {
  const list = document.getElementById("company-list");
  if (!list) return;

  if (companies.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <img src="../assets/graphics/notrackers.svg" alt="No trackers" />
        <div class="empty-title">No trackers detected</div>
        <div class="empty-sub">This page looks clean</div>
      </div>`;
    if (typeof window._syncFlipHeight === "function") requestAnimationFrame(window._syncFlipHeight);
    return;
  }

  list.innerHTML = companies.map(c => {
    const initials   = c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const tierLabel  = TIER_LABELS[c.tier] || "Tracker";
    const avatarClass = c.tier === 1 ? "t1" : c.tier === 2 ? "t2" : "t3";
    const badgeClass  = `t${c.tier}-badge`;
    return `
      <div class="company-card">
        <div class="company-avatar ${avatarClass}">${initials}</div>
        <div class="company-body">
          <div class="company-name">${c.name}</div>
          <div class="company-what">${c.what}</div>
        </div>
        <span class="tier-badge ${badgeClass}">${tierLabel}</span>
      </div>`;
  }).join("");
  if (typeof window._syncFlipHeight === "function") requestAnimationFrame(window._syncFlipHeight);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Back face: cookies + tracker scripts ──────────────────────
function renderBackFace(trackerScripts, cookieData) {
  const list = document.getElementById("cookie-script-list");
  if (!list) return;

  const cookieTrackers = cookieData?.trackers || [];
  const scripts = (trackerScripts || []).filter(t => (t.tracker || t.domain || t.url));

  let html = "";

  if (cookieTrackers.length > 0) {
    html += `<div class="detail-name" style="font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">🍪 Tracking Cookies</div>`;
    html += cookieTrackers.map(t => {
      const cookie  = t.cookie || t;
      const reasons = t.reasons || [];
      return `
        <div class="detail-item">
          <div class="detail-domain">${cookie.domain || "unknown"}</div>
          <div class="detail-name">Cookie: ${cookie.name || "—"}</div>
          ${reasons.length ? `<div class="detail-tags">${reasons.map(r => `<span class="detail-tag">${r}</span>`).join("")}</div>` : ""}
        </div>`;
    }).join("");
  }

  if (scripts.length > 0) {
    html += `<div class="detail-name" style="font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:${cookieTrackers.length ? "10px" : "0"} 0 4px;">🔍 Tracker Scripts</div>`;
    html += scripts.map(t => {
      const domain = t.tracker || t.domain || "";
      const url    = t.url || "";
      return `
        <div class="detail-script">
          <span>${domain}</span>
          ${url ? url.replace(domain, "").substring(0, 60) || "/" : ""}
        </div>`;
    }).join("");
  }

  if (!html) {
    html = `<div class="back-empty">No cookies or tracker scripts detected.</div>`;
  }

  list.innerHTML = html;

  // Sync card height after DOM update
  if (typeof window._syncFlipHeight === "function") {
    requestAnimationFrame(window._syncFlipHeight);
  }
}
