const $ = id => document.getElementById(id);

const KEY = "stockWatchlistV1";

const DEFAULTS = [
  {
    symbol: "000660.KS",
    name: "SK海力士",
    market: "KR",
    currency: "KRW"
  },
  {
    symbol: "07709.HK",
    name: "海力士每日两倍",
    market: "HK",
    currency: "HKD"
  },
  {
    symbol: "09868.HK",
    name: "小鹏汽车-W",
    market: "HK",
    currency: "HKD"
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ",
    market: "US",
    currency: "USD"
  }
];

let list =
  JSON.parse(localStorage.getItem(KEY) || "null") || DEFAULTS;

let quotes = {};
let isRefreshing = false;

function normalize(v) {
  v = v.trim().toUpperCase();

  const fixed = {
    "000660": {
      symbol: "000660.KS",
      name: "SK海力士",
      market: "KR",
      currency: "KRW"
    },

    "000660.KS": {
      symbol: "000660.KS",
      name: "SK海力士",
      market: "KR",
      currency: "KRW"
    },

    "07709": {
      symbol: "07709.HK",
      name: "海力士每日两倍",
      market: "HK",
      currency: "HKD"
    },

    "7709": {
      symbol: "07709.HK",
      name: "海力士每日两倍",
      market: "HK",
      currency: "HKD"
    },

    "07709.HK": {
      symbol: "07709.HK",
      name: "海力士每日两倍",
      market: "HK",
      currency: "HKD"
    },

    "9868": {
      symbol: "09868.HK",
      name: "小鹏汽车-W",
      market: "HK",
      currency: "HKD"
    },

    "09868": {
      symbol: "09868.HK",
      name: "小鹏汽车-W",
      market: "HK",
      currency: "HKD"
    },

    "09868.HK": {
      symbol: "09868.HK",
      name: "小鹏汽车-W",
      market: "HK",
      currency: "HKD"
    }
  };

  if (fixed[v]) {
    return fixed[v];
  }

  if (/^\d{5}\.HK$/.test(v)) {
    return {
      symbol: v,
      name: v.replace(".HK", ""),
      market: "HK",
      currency: "HKD"
    };
  }

  if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(v)) {
    return {
      symbol: v,
      name: v,
      market: "US",
      currency: "USD"
    };
  }

  throw new Error("代码格式无法识别");
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function fmt(n, currency) {
  if (n == null || !Number.isFinite(Number(n))) {
    return "—";
  }

  const digits = currency === "KRW" ? 0 : 2;

  return Number(n).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function render() {
  $("list").innerHTML = "";

  list.forEach((stock, index) => {
    const quote = quotes[stock.symbol] || {};

    const card = document.createElement("article");
    card.className = "stock-card";

    const changeClass =
      quote.changePercent > 0
        ? "up"
        : quote.changePercent < 0
          ? "down"
          : "";

    const changeText =
      quote.changePercent == null
        ? "等待刷新"
        : `${quote.changePercent > 0 ? "+" : ""}${Number(
            quote.changePercent
          ).toFixed(2)}%`;

    card.innerHTML = `
      <div class="stock-main">
        <div class="stock-name">${quote.name || stock.name}</div>
        <div class="ticker">${stock.symbol} · ${stock.market}</div>
      </div>

      <div class="quote">
        <div class="price">${fmt(
          quote.price,
          stock.currency
        )}</div>

        <div class="change ${changeClass}">
          ${changeText}
        </div>
      </div>

      <button class="delete" aria-label="删除">✕</button>
    `;

    card.querySelector(".stock-main").onclick = () => {
      location.href =
        `stock.html?symbol=${encodeURIComponent(stock.symbol)}` +
        `&name=${encodeURIComponent(stock.name)}` +
        `&market=${encodeURIComponent(stock.market)}` +
        `&currency=${encodeURIComponent(stock.currency)}`;
    };

    card.querySelector(".delete").onclick = () => {
      list.splice(index, 1);
      save();
      render();
    };

    $("list").appendChild(card);
  });
}

async function refresh() {
  if (isRefreshing) {
    return;
  }

  const base = window.STOCK_CONFIG?.API_BASE;

  if (!base) {
    $("message").textContent = "未配置 Worker 地址";
    return;
  }

  if (!list.length) {
    $("message").textContent = "自选列表为空";
    return;
  }

  isRefreshing = true;
  $("refresh").disabled = true;
  $("message").textContent = "正在获取行情…";

  try {
    const symbols = list
      .map(stock => stock.symbol)
      .join(",");

    const url =
      `${base}/api/quotes?symbols=` +
      encodeURIComponent(symbols);

    const response = await fetch(url, {
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}`
      );
    }

    const rows = data.quotes || data.data || [];

    quotes = Object.fromEntries(
      rows.map(item => [item.symbol, item])
    );

    // 兼容旧版海力士接口
    if (data.korea) {
      quotes["000660.KS"] = {
        ...data.korea,
        symbol: "000660.KS",
        name: "SK海力士"
      };
    }

    if (data.hk) {
      quotes["07709.HK"] = {
        ...data.hk,
        symbol: "07709.HK",
        name: "海力士每日两倍"
      };
    }

    const updateTime = new Date(
      data.updatedAt || Date.now()
    ).toLocaleString("zh-CN", {
      hour12: false
    });

    $("message").textContent =
      `刷新成功 · ${updateTime}`;

  } catch (error) {
    console.error("刷新行情失败：", error);

    $("message").textContent =
      `刷新失败：${error.message}。未使用虚构价格。`;

  } finally {
    isRefreshing = false;
    $("refresh").disabled = false;
    render();
  }
}

$("add").onclick = () => {
  try {
    const stock = normalize(
      $("symbolInput").value
    );

    if (
      list.some(
        item => item.symbol === stock.symbol
      )
    ) {
      throw new Error("已在自选中");
    }

    list.push(stock);
    save();

    $("symbolInput").value = "";
    $("message").textContent =
      `已添加 ${stock.name}`;

    render();

  } catch (error) {
    $("message").textContent = error.message;
  }
};

$("symbolInput").addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      $("add").click();
    }
  }
);

$("refresh").onclick = refresh;

$("theme").onclick = () => {
  const next =
    document.documentElement.dataset.theme === "dark"
      ? "light"
      : "dark";

  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);

  $("theme").textContent =
    next === "dark" ? "☀️" : "🌙";
};

document.documentElement.dataset.theme =
  localStorage.getItem("theme") || "light";

$("theme").textContent =
  document.documentElement.dataset.theme === "dark"
    ? "☀️"
    : "🌙";

render();

// 打开页面后自动刷新一次
refresh();

// 页面处于前台时，每15秒刷新一次
setInterval(() => {
  if (!document.hidden) {
    refresh();
  }
}, 15000);

// 从后台返回页面时立即刷新一次
document.addEventListener(
  "visibilitychange",
  () => {
    if (!document.hidden) {
      refresh();
    }
  }
);