const state = {
  currentReportId: null,
  reports: loadReports(),
};

const tips = [
  "标题不是越夸张越好，而是要让目标用户觉得“这说的就是我”。",
  "新号前 20 篇别急着变现，先让系统看懂你是谁。",
  "选题不是写自己想说什么，而是写用户正在搜什么。",
  "小红书更吃具体场景，少写大道理，多写具体人、具体问题、具体结果。",
];

const categoryAngles = {
  职场成长: ["避坑经验", "转行路径", "简历面试", "上班情绪", "效率方法"],
  副业赚钱: ["副业复盘", "低成本启动", "踩坑清单", "普通人路径", "变现拆解"],
  情绪疗愈: ["关系边界", "自我接纳", "内耗停止", "情绪急救", "真实故事"],
  读书成长: ["书单整理", "读后改变", "方法拆解", "金句应用", "成长复盘"],
  育儿教育: ["亲子沟通", "习惯培养", "学习方法", "家长情绪", "低成本陪伴"],
  美妆穿搭: ["场景穿搭", "平价替代", "妆容教程", "避雷测评", "风格定位"],
  探店本地生活: ["同城攻略", "真实体验", "避雷清单", "套餐对比", "拍照机位"],
  "AI 工具分享": ["效率提升", "工具清单", "工作流", "提示词", "案例复盘"],
  其他: ["新手避坑", "经验复盘", "清单收藏", "场景教程", "问题解决"],
};

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  bindForm();
  bindLeadForm();
  bindModal();
  bindCopy();
  bindChoiceLimits();
  route();
});

function route() {
  const rawHash = window.location.hash || "#home";
  const [hash, queryString] = rawHash.split("?");
  const params = new URLSearchParams(queryString || "");
  const id = params.get("id");

  hideModal();
  setActiveView(hash.replace("#", "") || "home");

  if (hash === "#loading") {
    state.currentReportId = id;
    startLoading(id);
  }

  if (hash === "#report") {
    state.currentReportId = id;
    renderFreeReport(id);
  }

  if (hash === "#full") {
    state.currentReportId = id;
    renderFullReport(id);
  }

}

function setActiveView(name) {
  const valid = ["home", "diagnosis", "loading", "report", "full", "privacy"];
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));

  if (name === "sample") {
    document.querySelector("#home").classList.add("active");
    setTimeout(() => document.querySelector("#sample")?.scrollIntoView({ block: "center" }), 0);
    return;
  }

  const target = valid.includes(name) ? name : "home";
  document.querySelector(`#${target}`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function bindForm() {
  const form = document.querySelector("#diagnosisForm");
  const error = document.querySelector("#formError");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    error.textContent = "";

    const formData = new FormData(form);
    const payload = normalizeForm(formData);
    const validationError = validateDiagnosis(payload);

    if (validationError) {
      error.textContent = validationError;
      return;
    }

    const id = `report_${Date.now()}`;
    state.reports[id] = {
      id,
      createdAt: new Date().toISOString(),
      input: payload,
      status: "pending",
      unlocked: false,
      lead: null,
      report: null,
    };
    saveReports();
    trackEvent("form_submit", { id, category: payload.category });
    window.location.hash = `#loading?id=${id}`;
  });
}

function normalizeForm(formData) {
  const titles = String(formData.get("recentTitles") || "")
    .split("\n")
    .map((title) => title.trim())
    .filter(Boolean);

  return {
    accountName: String(formData.get("accountName") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    followers: String(formData.get("followers") || "").trim(),
    goals: formData.getAll("goals").map(String),
    targetAudience: String(formData.get("targetAudience") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
    recentTitles: titles,
    painPoint: String(formData.get("painPoint") || "").trim(),
  };
}

function validateDiagnosis(payload) {
  if (!payload.category) return "先选一个账号赛道，AI 才知道按哪个方向诊断。";
  if (!payload.followers) return "先选一下当前粉丝量，这会影响起号建议。";
  if (payload.goals.length === 0) return "至少选一个账号目标，不然报告没法判断方向。";
  if (payload.goals.length > 2) return "账号目标最多选 2 个，先聚焦最重要的事。";
  if (!payload.targetAudience) return "写一下你的目标人群，越具体诊断越准。";
  if (payload.recentTitles.length < 3) return "至少填 3 个标题，不然很难看出账号问题。";
  if (!payload.painPoint) return "写一下当前最大困惑，报告会围绕这个问题给建议。";
  return "";
}

function bindChoiceLimits() {
  document.querySelectorAll("[data-checkbox-limit]").forEach((group) => {
    const limit = Number(group.dataset.checkboxLimit || 2);
    group.addEventListener("change", () => {
      const checked = [...group.querySelectorAll("input:checked")];
      if (checked.length > limit) checked.at(-1).checked = false;
    });
  });
}

function startLoading(id) {
  const report = state.reports[id];
  if (!report) {
    window.location.hash = "#diagnosis";
    return;
  }

  const bar = document.querySelector("#progressBar");
  const steps = [...document.querySelectorAll("#loadingSteps li")];
  const tip = document.querySelector("#loadingTip");
  let index = 0;

  steps.forEach((step) => step.classList.remove("done"));
  bar.style.width = "18%";

  const timer = window.setInterval(() => {
    index += 1;
    steps.slice(0, index).forEach((step) => step.classList.add("done"));
    bar.style.width = `${Math.min(18 + index * 24, 100)}%`;
    tip.textContent = tips[index % tips.length];

    if (index >= steps.length) {
      window.clearInterval(timer);
      report.status = "success";
      report.report = generateReport(report.input);
      state.reports[id] = report;
      saveReports();
      trackEvent("report_generate_success", { id, category: report.input.category });
      window.location.hash = `#report?id=${id}`;
    }
  }, 700);
}

function generateReport(input) {
  const titleStats = analyzeTitles(input.recentTitles);
  const baseScore = 74 - titleStats.diaryCount * 5 - titleStats.shortCount * 3 + Math.min(input.targetAudience.length, 30) / 3;
  const score = clamp(Math.round(baseScore), 45, 88);
  const titleScore = clamp(score - titleStats.diaryCount * 6, 38, 86);
  const positioningScore = clamp(input.targetAudience.length > 18 ? score + 8 : score - 7, 42, 90);
  const topicScore = clamp(score - (input.goals.includes("还没想清楚") ? 8 : 0), 40, 88);

  const angles = categoryAngles[input.category] || categoryAngles["其他"];
  const persona = input.targetAudience;
  const category = input.category;
  const mainTitle = input.recentTitles[0];

  const problems = [
    {
      title: "标题没有把“谁遇到什么问题”说清楚",
      advice: `你现在的标题更像自我记录。建议改成“${persona} + 具体卡点 + 可获得结果”的结构。`,
    },
    {
      title: "账号目标和内容承接还不够聚焦",
      advice: `你选择的目标是 ${input.goals.join("、")}。前 20 篇建议只围绕 2-3 个固定栏目发，先让用户和平台知道你解决什么问题。`,
    },
    {
      title: "选题缺少可收藏的结构",
      advice: `把经验表达改成清单、步骤、避坑、模板和复盘，更适合小红书用户保存。`,
    },
  ];

  const topicIdeas = buildTopics(category, persona, angles, 30);
  const titleRewrites = buildTitleRewrites(mainTitle, persona, angles, 20);

  return {
    score,
    metrics: {
      positioning: positioningScore,
      title: titleScore,
      topic: topicScore,
    },
    summary: `这个账号不是完全没方向，主要问题是“能看出你想做 ${category}，但用户还不能一眼判断为什么要点开”。先把目标人群、标题痛点和栏目结构收窄，流量反馈会更稳定。`,
    problems,
    freeTopics: topicIdeas.slice(0, 5),
    topicIdeas,
    titleSummary: `近期标题里，“我想表达什么”的痕迹偏重，“用户正在搜什么”的痕迹偏弱。建议减少抽象词，多放场景、人群和结果。`,
    titleExample: {
      before: mainTitle,
      after: titleRewrites[0],
      reason: "改写后明确了目标人群、痛点和结果，用户更容易判断这篇是否值得点开。",
    },
    positioningAdvice: [
      `账号简介建议直接写清楚：我帮 ${persona} 解决什么问题。`,
      `固定 3 个栏目：${angles.slice(0, 3).join("、")}。不要今天发情绪，明天发工具，后天又发生活流水账。`,
      `每篇笔记结尾都要有一个轻承接动作，例如评论关键词、收藏清单、私信领取模板。`,
    ],
    audienceAdvice: `目标人群可以再具体一层：不要只写“想成长的人”，要写成“处在什么阶段、遇到什么问题、愿意为什么付费的人”。你目前可以聚焦：${persona}。`,
    contentDirections: angles.map((angle) => `${angle}：围绕 ${persona} 的真实问题做系列内容。`),
    titleRewrites,
    sevenDayPlan: angles.slice(0, 7).map((angle, index) => ({
      day: `第 ${index + 1} 天`,
      topic: topicIdeas[index],
      goal: index < 2 ? "让平台识别账号方向" : index < 5 ? "测试用户点击与收藏" : "承接评论和私信",
    })),
    coverCopy: [
      "别再这样写标题",
      "新手起号先改这 3 点",
      "这类选题更容易被收藏",
      "你的账号卡点可能在这里",
      "7 天内容计划直接照着发",
    ],
    commentReplies: [
      "你这个情况更像是定位太宽，可以先把目标人群缩到一个具体场景。",
      "可以把你最近 3 个标题发我，我帮你看是选题问题还是标题问题。",
      "先别急着日更，建议先固定 3 个栏目测试一周。",
      "如果你是想引流私域，笔记结尾要加一个自然的承接动作。",
    ],
    actionItems: [
      "今天先重写账号简介，明确服务谁、解决什么问题。",
      "从 30 个选题里选 7 个，连续发布一周。",
      "每篇标题都加入具体人群或具体场景。",
      "发布后记录点击、收藏、评论，7 天后复盘栏目效果。",
    ],
  };
}

function analyzeTitles(titles) {
  const diaryWords = ["日常", "随便", "记录", "分享一下", "最近", "碎碎念"];
  return titles.reduce(
    (stats, title) => {
      if (title.length < 12) stats.shortCount += 1;
      if (diaryWords.some((word) => title.includes(word))) stats.diaryCount += 1;
      return stats;
    },
    { shortCount: 0, diaryCount: 0 },
  );
}

function buildTopics(category, persona, angles, count) {
  const templates = [
    "{persona}做{category}，先别急着努力，先看这 3 个卡点",
    "我建议{persona}收藏的 7 个{angle}方法",
    "{category}新手最容易踩的 5 个坑",
    "如果你也在{angle}上卡住，可以照这个顺序改",
    "普通人做{category}，第一周应该发什么",
    "{persona}想起号，标题先改成这类表达",
  ];

  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    const angle = angles[index % angles.length];
    return template
      .replaceAll("{persona}", persona)
      .replaceAll("{category}", category)
      .replaceAll("{angle}", angle);
  });
}

function buildTitleRewrites(title, persona, angles, count) {
  const cleanTitle = title || "这篇笔记";
  const templates = [
    "{persona}别再这样写标题了，真的很难被点开",
    "把“{title}”改成小红书标题，我会这样写",
    "{persona}做账号没流量，先检查这 3 个地方",
    "新手做{angle}内容，最该避开的不是日更",
    "发了很多篇还没流量，可能不是内容不够好",
    "{persona}起号第一周，照这个标题结构写",
  ];

  return Array.from({ length: count }, (_, index) => {
    const angle = angles[index % angles.length];
    return templates[index % templates.length]
      .replaceAll("{persona}", persona)
      .replaceAll("{title}", cleanTitle)
      .replaceAll("{angle}", angle);
  });
}

function renderFreeReport(id) {
  const root = document.querySelector("#freeReportRoot");
  const record = state.reports[id];

  if (!record || !record.report) {
    root.innerHTML = emptyState("没有找到这份报告，可能链接不完整或报告已过期。");
    return;
  }

  const report = record.report;
  trackEvent("free_report_view", { id });

  root.innerHTML = `
    <div class="report-grid">
      <article class="score-card">
        <span class="score-number">${report.score}</span>
        <strong>账号体检分</strong>
        <p>${escapeHtml(report.summary)}</p>
        ${renderMetrics(report.metrics)}
      </article>
      <article class="report-card">
        <h2>当前最大问题</h2>
        <div class="report-stack">
          ${report.problems
            .slice(0, 2)
            .map(
              (item) => `
                <div class="problem-item">
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.advice)}</p>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </div>
    <div class="report-stack">
      <article class="report-card">
        <h2>标题问题总结</h2>
        <p>${escapeHtml(report.titleSummary)}</p>
        <div class="title-item">
          <strong>改写示例</strong>
          <p>原标题：${escapeHtml(report.titleExample.before)}</p>
          <p>新标题：${escapeHtml(report.titleExample.after)}</p>
          <p>${escapeHtml(report.titleExample.reason)}</p>
        </div>
      </article>
      <article class="report-card">
        <h2>5 个推荐选题</h2>
        <div class="report-stack">
          ${report.freeTopics.map((topic) => `<div class="topic-item"><strong>${escapeHtml(topic)}</strong><p>适合先测试点击和收藏反馈。</p></div>`).join("")}
        </div>
      </article>
      <article class="unlock-panel">
        <h2>完整报告已经生成</h2>
        <ul>
          <li>完整账号诊断</li>
          <li>30 个可直接发的选题</li>
          <li>20 个标题改写</li>
          <li>7 天发布计划</li>
          <li>封面文案</li>
          <li>评论区互动话术</li>
        </ul>
        <button class="btn primary" type="button" id="unlockButton">解锁完整报告</button>
      </article>
    </div>
  `;

  document.querySelector("#unlockButton").addEventListener("click", () => {
    trackEvent("unlock_click", { id });
    showModal();
  });
}

function renderMetrics(metrics) {
  const rows = [
    ["定位清晰度", metrics.positioning],
    ["标题点击感", metrics.title],
    ["选题匹配度", metrics.topic],
  ];

  return `
    <div class="metric-list">
      ${rows
        .map(
          ([label, value]) => `
            <div class="metric-row">
              <span>${label}</span>
              <div class="metric-bar"><span style="width:${value}%"></span></div>
              <strong>${value}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderFullReport(id) {
  const root = document.querySelector("#fullReportRoot");
  const record = state.reports[id];

  if (!record || !record.report) {
    root.innerHTML = emptyState("没有找到这份报告，可能链接不完整或报告已过期。");
    return;
  }

  if (!record.unlocked) {
    window.location.hash = `#report?id=${id}`;
    setTimeout(showModal, 120);
    return;
  }

  const report = record.report;
  root.innerHTML = `
    <div class="report-stack">
      <article class="score-card">
        <span class="score-number">${report.score}</span>
        <strong>账号体检总评</strong>
        <p>${escapeHtml(report.summary)}</p>
        ${renderMetrics(report.metrics)}
      </article>
      ${renderSection("当前最影响流量的 3 个问题", report.problems.map((item) => `${item.title}：${item.advice}`))}
      ${renderSection("账号定位优化建议", report.positioningAdvice)}
      ${renderParagraphSection("目标人群重新定义", report.audienceAdvice)}
      ${renderSection("内容选题方向", report.contentDirections)}
      ${renderSection("30 个可直接发布的选题", report.topicIdeas)}
      ${renderSection("20 个标题改写版本", report.titleRewrites)}
      ${renderPlan(report.sevenDayPlan)}
      ${renderSection("封面文案建议", report.coverCopy)}
      ${renderSection("评论区互动话术", report.commentReplies)}
      ${renderSection("下一步行动清单", report.actionItems)}
    </div>
  `;
}

function renderSection(title, items) {
  return `
    <article class="report-card">
      <h2>${escapeHtml(title)}</h2>
      <div class="report-stack">
        ${items.map((item) => `<div class="topic-item"><strong>${escapeHtml(item)}</strong></div>`).join("")}
      </div>
    </article>
  `;
}

function renderParagraphSection(title, text) {
  return `
    <article class="report-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function renderPlan(plan) {
  return `
    <article class="report-card">
      <h2>7 天发布计划</h2>
      <div class="report-stack">
        ${plan
          .map(
            (item) => `
              <div class="plan-item">
                <strong>${escapeHtml(item.day)}：${escapeHtml(item.topic)}</strong>
                <p>${escapeHtml(item.goal)}</p>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function bindLeadForm() {
  const form = document.querySelector("#leadForm");
  const error = document.querySelector("#leadError");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const wechat = String(formData.get("wechat") || "").trim();
    const manualReview = String(formData.get("manualReview") || "");

    if (!wechat) {
      error.textContent = "先填一下微信号，方便后续同步完整报告。";
      return;
    }

    const record = state.reports[state.currentReportId];
    if (!record) return;

    record.unlocked = true;
    record.lead = { wechat, manualReview, createdAt: new Date().toISOString() };
    state.reports[state.currentReportId] = record;
    saveReports();
    trackEvent("lead_submit", { id: record.id });
    hideModal();
    showToast("已解锁完整报告");
    window.location.hash = `#full?id=${record.id}`;
  });
}

function bindModal() {
  document.querySelector("#closeModal").addEventListener("click", hideModal);
  document.querySelector("#unlockModal").addEventListener("click", (event) => {
    if (event.target.id === "unlockModal") hideModal();
  });
}

function showModal() {
  document.querySelector("#unlockModal").classList.add("open");
  document.querySelector("#unlockModal").setAttribute("aria-hidden", "false");
}

function hideModal() {
  document.querySelector("#unlockModal").classList.remove("open");
  document.querySelector("#unlockModal").setAttribute("aria-hidden", "true");
  document.querySelector("#leadError").textContent = "";
}

function bindCopy() {
  document.querySelector("#copyFullReport").addEventListener("click", async () => {
    const record = state.reports[state.currentReportId];
    if (!record?.report) return;

    const text = reportToText(record.report);
    try {
      await navigator.clipboard.writeText(text);
      showToast("报告已复制");
    } catch {
      showToast("复制失败，可以手动选择文本");
    }
  });
}

function reportToText(report) {
  return [
    `账号体检分：${report.score}`,
    report.summary,
    "\n当前问题：",
    ...report.problems.map((item) => `- ${item.title}：${item.advice}`),
    "\n30 个选题：",
    ...report.topicIdeas.map((item, index) => `${index + 1}. ${item}`),
    "\n7 天发布计划：",
    ...report.sevenDayPlan.map((item) => `${item.day}：${item.topic}；目标：${item.goal}`),
  ].join("\n");
}

function emptyState(message) {
  return `
    <article class="report-card">
      <h2>报告不可用</h2>
      <p>${escapeHtml(message)}</p>
      <a class="btn primary" href="#diagnosis">重新开始诊断</a>
    </article>
  `;
}

function loadReports() {
  try {
    return JSON.parse(localStorage.getItem("accountDoctorReports") || "{}");
  } catch {
    return {};
  }
}

function saveReports() {
  localStorage.setItem("accountDoctorReports", JSON.stringify(state.reports));
}

function trackEvent(name, payload = {}) {
  const events = JSON.parse(localStorage.getItem("accountDoctorEvents") || "[]");
  events.push({ name, payload, createdAt: new Date().toISOString() });
  localStorage.setItem("accountDoctorEvents", JSON.stringify(events.slice(-200)));
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
