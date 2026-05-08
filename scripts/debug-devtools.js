/**
 * Generic Chrome DevTools Protocol (CDP) inspector.
 *
 * Usage:
 *   1. Start Chrome with remote debugging:
 *        /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *          --remote-debugging-port=9222 --headless=new --disable-gpu \
 *          http://localhost:3000
 *   2. Run:  node scripts/debug-devtools.js
 *
 * Edit the CHECKS array below to inspect any selector, property, or JS expression.
 * The script navigates to each URL, optionally sets up state, then runs your checks.
 */

const WebSocket = require("ws");
const http = require("http");

// ─── Configure your checks here ──────────────────────────────────────────────

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true };

const SCENARIOS = [
  {
    label: "Light mode — home",
    setup: `localStorage.setItem("tp-theme","light")`,
    url: "http://localhost:3000",
    checks: [
      { label: "Header img",     expr: `(() => { const el = document.querySelector("header img"); if (!el) return "not found"; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, naturalW: el.naturalWidth, naturalH: el.naturalHeight, src: el.src.split("/").pop().split("?")[0] }; })()` },
      { label: "Nav padding",    expr: `(() => { const nav = document.querySelector("header nav"); return nav ? getComputedStyle(nav).paddingLeft : "not found"; })()` },
    ],
  },
  {
    label: "Dark mode — home",
    setup: `localStorage.setItem("tp-theme","dark")`,
    url: "http://localhost:3000",
    checks: [
      { label: "Header img",     expr: `(() => { const el = document.querySelector("header img"); if (!el) return "not found"; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height, naturalW: el.naturalWidth, naturalH: el.naturalHeight, src: el.src.split("/").pop().split("?")[0] }; })()` },
      { label: "Nav padding",    expr: `(() => { const nav = document.querySelector("header nav"); return nav ? getComputedStyle(nav).paddingLeft : "not found"; })()` },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────

function httpGet(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:9222${path}`, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(JSON.parse(d)));
    });
  });
}

(async () => {
  const tabs = await httpGet("/json/list");
  const tab = tabs.find((t) => t.url.includes("localhost:3000"));
  if (!tab) {
    console.error("No localhost:3000 tab found. Is Chrome running with --remote-debugging-port=9222?");
    process.exit(1);
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const mid = ++id;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === mid) { ws.off("message", handler); resolve(msg.result); }
      };
      ws.on("message", handler);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }

  function evaluate(expr) {
    return send("Runtime.evaluate", { expression: expr, returnByValue: true });
  }

  ws.on("open", async () => {
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", VIEWPORT);

    for (const scenario of SCENARIOS) {
      console.log(`\n${"─".repeat(60)}`);
      console.log(`SCENARIO: ${scenario.label}`);
      console.log("─".repeat(60));

      if (scenario.setup) await evaluate(scenario.setup);
      await send("Page.navigate", { url: scenario.url });
      await new Promise((r) => setTimeout(r, 3500));

      for (const check of scenario.checks) {
        const result = await evaluate(check.expr);
        const value = result?.result?.value;
        console.log(`\n  [${check.label}]`);
        console.log("  " + JSON.stringify(value, null, 2).replace(/\n/g, "\n  "));
      }
    }

    ws.close();
    process.exit(0);
  });

  ws.on("error", (e) => {
    console.error("WebSocket error:", e.message);
    process.exit(1);
  });
})();
