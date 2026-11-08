// TONIGHT_WIDGET — '오늘 밤 할 것' 위젯 본문 (Scriptable).
// 아이폰의 Scriptable 에는 로더(작은 코드)만 넣고, 로더가 이 파일을 받아 실행한다. 여기만 고치면 위젯이 바뀐다.
const API = "https://api.owndrug.space/tonight/api/state";
const PAGE = "https://hjlee2023.github.io/tonight/";

let S = null;
try {
  const req = new Request(API);
  req.timeoutInterval = 10;
  S = await req.loadJSON();
  if (!S || typeof S.streak !== "number") S = null;
} catch (e) { S = null; }

const family = config.widgetFamily || "medium";
const w = new ListWidget();
w.url = PAGE;

// ── 상태 ─────────────────────────────────────────────────────────
const k = S ? S.streak : 0;
const done = !!(S && S.today_done);
const open = !!(S && S.open);
const mode = !S ? "error" : done ? "done" : open ? "go" : "wait";

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
// 최근 7밤: true 돌림 / false 놓침 / null 오늘(아직)
const dots = [];
if (S) {
  const have = new Set(S.spins.map(r => r.night));
  for (let i = 6; i >= 0; i--) {
    const n = addDays(S.today_night, -i);
    dots.push(have.has(n) ? true : i === 0 ? null : false);
  }
}
const todayRec = S ? S.spins.find(r => r.night === S.today_night) : null;

// 다음 새로고침(실제 시점은 iOS 가 정한다)
(() => {
  const now = Date.now();
  let next = now + (mode === "go" ? 10 : 30) * 60 * 1000;
  if (S) {
    for (const iso of [S.opens_at, S.closes_at]) {
      const t = iso ? Date.parse(iso) : NaN;
      if (t > now) next = Math.min(next, t + 5000);
    }
  }
  w.refreshAfterDate = new Date(next);
})();

const STATUS = {
  done: "오늘 완료 ✓",
  go: k ? "지금 돌릴 시간!" : "첫 불씨 켜기",
  wait: "오늘 밤 10시",
  error: "불러오지 못했어요",
};

const C = {
  gold: new Color("#ffd166"),
  white: Color.white(),
  muted: new Color("#a3a8d6"),
  faint: new Color("#ffffff", 0.28),
};
const BG = {
  done: [["#ff9f5a", "#ff5e8a", "#b0459b"], [0, .55, 1]],
  go: [["#2b2f7a", "#4b2a8a", "#7a2f8f"], [0, .6, 1]],
  wait: [["#1d2152", "#0d1026"], [0, 1]],
  error: [["#1d2152", "#0d1026"], [0, 1]],
};

function addFlame(stack, size, color) {
  const sym = SFSymbol.named(k > 0 ? "flame.fill" : "flame");
  if (!sym || !sym.image) return;
  const im = stack.addImage(sym.image);
  im.imageSize = new Size(size, size);
  im.tintColor = color;
}
function addDots(stack, size, onColor, offColor, todayColor) {
  const row = stack.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  dots.forEach((d, i) => {
    const t = row.addText(d === null ? "○" : "●");
    t.font = Font.systemFont(size);
    t.textColor = d === true ? onColor : d === null ? todayColor : offColor;
    if (i < dots.length - 1) row.addSpacer(size * 0.35);
  });
  return row;
}

// ── 잠금 화면 ─────────────────────────────────────────────────────
if (family === "accessoryInline") {
  const tail = { done: "완료 ✓", go: "지금 돌리기", wait: "밤 10시", error: "…" }[mode];
  w.addText(`🔥 ${k}밤 연속 · ${tail}`);
} else if (family === "accessoryCircular") {
  w.addAccessoryWidgetBackground = true;
  const col = w.addStack();
  col.layoutVertically();
  col.centerAlignContent();
  const top = col.addStack(); top.addSpacer();
  addFlame(top, 12, C.white);
  top.addSpacer();
  const mid = col.addStack(); mid.addSpacer();
  const n = mid.addText(String(k));
  n.font = Font.heavyRoundedSystemFont(k >= 100 ? 17 : 22);
  n.minimumScaleFactor = 0.5;
  mid.addSpacer();
  const bot = col.addStack(); bot.addSpacer();
  const s = bot.addText(mode === "done" ? "✓" : mode === "go" ? "GO" : "밤");
  s.font = Font.boldRoundedSystemFont(10);
  bot.addSpacer();
} else if (family === "accessoryRectangular") {
  const head = w.addStack();
  head.centerAlignContent();
  addFlame(head, 14, C.white);
  head.addSpacer(4);
  const h = head.addText(`${k}밤 연속`);
  h.font = Font.heavyRoundedSystemFont(16);
  w.addSpacer(1);
  const st = w.addText(STATUS[mode]);
  st.font = Font.semiboldSystemFont(13);
  w.addSpacer(2);
  if (dots.length) addDots(w, 10, C.white, new Color("#ffffff", 0.35), new Color("#ffffff", 0.8));
} else {
  // ── 홈 화면 ───────────────────────────────────────────────────
  const [cols, locs] = BG[mode];
  const g = new LinearGradient();
  g.colors = cols.map(c => new Color(c));
  g.locations = locs;
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  w.backgroundGradient = g;
  const small = family === "small";
  w.setPadding(14, 14, 14, 14);

  const accent = mode === "done" ? C.white : mode === "go" ? C.gold : new Color("#ffd166", k ? 0.9 : 0.5);
  const sub = mode === "done" ? new Color("#ffffff", 0.85) : C.muted;

  const main = w.addStack();
  main.layoutHorizontally();
  main.topAlignContent();

  // 왼쪽(또는 전체): 큰 숫자
  const left = main.addStack();
  left.layoutVertically();
  const title = left.addText("☾ 오늘 밤");
  title.font = Font.semiboldSystemFont(12);
  title.textColor = sub;
  left.addSpacer(small ? 4 : 6);
  const numRow = left.addStack();
  numRow.centerAlignContent();
  addFlame(numRow, small ? 22 : 26, accent);
  numRow.addSpacer(4);
  const num = numRow.addText(String(k));
  num.font = Font.heavyRoundedSystemFont(small ? 40 : 46);
  num.textColor = mode === "done" ? C.white : mode === "wait" && !k ? C.muted : C.white;
  num.minimumScaleFactor = 0.5;
  num.lineLimit = 1;
  const unit = left.addText("밤 연속");
  unit.font = Font.semiboldSystemFont(12);
  unit.textColor = sub;

  if (!small) {
    main.addSpacer();
    const right = main.addStack();
    right.layoutVertically();
    right.size = new Size(150, 0);
    const st = right.addText(STATUS[mode]);
    st.font = Font.heavyRoundedSystemFont(17);
    st.textColor = mode === "go" ? C.gold : C.white;
    st.lineLimit = 1;
    st.minimumScaleFactor = 0.6;
    right.addSpacer(6);
    if (todayRec && done) {
      for (const [i, p] of [[1, todayRec.first], [2, todayRec.second]]) {
        const t = right.addText(`${i}  ${p.name}`);
        t.font = Font.semiboldSystemFont(13);
        t.textColor = new Color("#ffffff", 0.92);
        t.lineLimit = 1;
        t.minimumScaleFactor = 0.6;
      }
    } else {
      const t = right.addText(mode === "go" ? "새벽 1시 마감" : mode === "wait" ? "밤 10시 ~ 새벽 1시" : "");
      t.font = Font.systemFont(13);
      t.textColor = C.muted;
    }
  }

  w.addSpacer();
  if (small) {
    const st = w.addText(STATUS[mode]);
    st.font = Font.heavyRoundedSystemFont(14);
    st.textColor = mode === "go" ? C.gold : C.white;
    st.lineLimit = 1;
    st.minimumScaleFactor = 0.6;
    w.addSpacer(4);
  }
  if (dots.length) {
    addDots(w, small ? 9 : 11,
      mode === "done" ? C.white : C.gold,
      new Color("#ffffff", mode === "done" ? 0.35 : 0.22),
      new Color("#ffffff", 0.75));
  }
}

if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
