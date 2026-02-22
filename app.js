const trendInput = document.getElementById("trendInput");
const volInput = document.getElementById("volInput");
const regimeInput = document.getElementById("regimeInput");
const trendValue = document.getElementById("trendValue");
const volValue = document.getElementById("volValue");
const regimeValue = document.getElementById("regimeValue");

const fastInput = document.getElementById("fastInput");
const slowInput = document.getElementById("slowInput");

const regenerateBtn = document.getElementById("regenerateBtn");
const runBtn = document.getElementById("runBtn");

const totalReturnEl = document.getElementById("totalReturn");
const sharpeEl = document.getElementById("sharpe");
const drawdownEl = document.getElementById("drawdown");
const winRateEl = document.getElementById("winRate");
const tradesEl = document.getElementById("trades");
const equityEl = document.getElementById("equity");

const priceCanvas = document.getElementById("priceChart");
const equityCanvas = document.getElementById("equityChart");
const priceCtx = priceCanvas.getContext("2d");
const equityCtx = equityCanvas.getContext("2d");

let marketSeries = [];
let lastResult = null;

function randomNormal() {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function movingAverage(data, period) {
  const out = Array(data.length).fill(null);
  let sum = 0;

  for (let i = 0; i < data.length; i += 1) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i >= period - 1) {
      out[i] = sum / period;
    }
  }

  return out;
}

function generateMarket() {
  const trendBias = Number(trendInput.value);
  const volatility = Number(volInput.value);
  const regimes = Number(regimeInput.value);

  const length = 420;
  let price = 100;
  const series = [];

  const regimeLength = Math.floor(length / regimes);
  const drifts = Array.from({ length: regimes }, (_, i) => {
    const wave = Math.sin((i / Math.max(1, regimes - 1)) * Math.PI * 2) * 0.18;
    return trendBias + wave * 0.25 + (Math.random() - 0.5) * 0.15;
  });

  for (let i = 0; i < length; i += 1) {
    const regimeIndex = Math.min(regimes - 1, Math.floor(i / regimeLength));
    const drift = drifts[regimeIndex];
    const shock = randomNormal() * volatility;
    const seasonal = Math.sin(i / 17) * 0.24 + Math.cos(i / 31) * 0.16;

    const returnPct = drift * 0.003 + seasonal * 0.001 + shock * 0.006;
    const open = price;
    const close = Math.max(5, price * (1 + returnPct));
    const high = Math.max(open, close) * (1 + Math.random() * 0.012);
    const low = Math.min(open, close) * (1 - Math.random() * 0.012);

    series.push({
      index: i,
      open,
      high,
      low,
      close,
      returnPct,
    });

    price = close;
  }

  marketSeries = series;
}

function backtest() {
  const fast = Number(fastInput.value);
  const slow = Number(slowInput.value);

  if (fast < 2 || slow < 3 || fast >= slow) {
    alert("Use valid windows where Fast SMA < Slow SMA.");
    return;
  }

  const closes = marketSeries.map((item) => item.close);
  const fastMA = movingAverage(closes, fast);
  const slowMA = movingAverage(closes, slow);

  let equity = 10000;
  let peak = equity;
  let maxDrawdown = 0;
  let position = 0;
  let entryPrice = 0;
  let winningTrades = 0;
  let closedTrades = 0;

  const equityCurve = [equity];
  const strategyReturns = [];
  const buySignals = [];
  const sellSignals = [];

  for (let i = 1; i < marketSeries.length; i += 1) {
    const previousClose = closes[i - 1];
    const currentClose = closes[i];

    if (fastMA[i] != null && slowMA[i] != null) {
      const shouldBeLong = fastMA[i] > slowMA[i] ? 1 : 0;

      if (shouldBeLong === 1 && position === 0) {
        position = 1;
        entryPrice = currentClose;
        buySignals.push(i);
      }

      if (shouldBeLong === 0 && position === 1) {
        position = 0;
        sellSignals.push(i);
        closedTrades += 1;
        if (currentClose > entryPrice) {
          winningTrades += 1;
        }
      }
    }

    const dailyReturn = (currentClose - previousClose) / previousClose;
    const strategyReturn = position * dailyReturn;
    strategyReturns.push(strategyReturn);

    equity *= 1 + strategyReturn;
    peak = Math.max(peak, equity);
    const drawdown = (equity - peak) / peak;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
    equityCurve.push(equity);
  }

  if (position === 1) {
    closedTrades += 1;
    if (closes[closes.length - 1] > entryPrice) {
      winningTrades += 1;
    }
  }

  const mean = strategyReturns.reduce((acc, val) => acc + val, 0) / Math.max(1, strategyReturns.length);
  const variance =
    strategyReturns.reduce((acc, val) => acc + (val - mean) ** 2, 0) /
    Math.max(1, strategyReturns.length - 1);
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev ? (mean / stdDev) * Math.sqrt(252) : 0;

  lastResult = {
    fastMA,
    slowMA,
    equityCurve,
    buySignals,
    sellSignals,
    totalReturn: (equity / 10000 - 1) * 100,
    sharpe,
    maxDrawdown: maxDrawdown * 100,
    winRate: closedTrades ? (winningTrades / closedTrades) * 100 : 0,
    trades: closedTrades,
    finalEquity: equity,
  };

  updateMetrics();
  drawCharts();
}

function formatMoney(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function updateMetrics() {
  totalReturnEl.textContent = `${lastResult.totalReturn.toFixed(2)}%`;
  totalReturnEl.style.color = lastResult.totalReturn >= 0 ? "#2ad59b" : "#ff6f7f";

  sharpeEl.textContent = lastResult.sharpe.toFixed(2);
  sharpeEl.style.color = lastResult.sharpe >= 1 ? "#2ad59b" : "#ffd166";

  drawdownEl.textContent = `${lastResult.maxDrawdown.toFixed(2)}%`;
  drawdownEl.style.color = "#ff8fa3";

  winRateEl.textContent = `${lastResult.winRate.toFixed(1)}%`;
  tradesEl.textContent = String(lastResult.trades);
  equityEl.textContent = formatMoney(lastResult.finalEquity);
  equityEl.style.color = lastResult.finalEquity >= 10000 ? "#2ad59b" : "#ff6f7f";
}

function drawGrid(ctx, width, height, horizontal = 5) {
  ctx.strokeStyle = "rgba(116, 157, 181, 0.16)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= horizontal; i += 1) {
    const y = (i / horizontal) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let i = 0; i <= 8; i += 1) {
    const x = (i / 8) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function seriesMinMax(values) {
  let min = Infinity;
  let max = -Infinity;

  values.forEach((value) => {
    if (value == null) return;
    if (value < min) min = value;
    if (value > max) max = value;
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }

  const pad = (max - min) * 0.1 || 1;
  return { min: min - pad, max: max + pad };
}

function plotLine(ctx, values, color, min, max, width, height, lineWidth = 2) {
  ctx.beginPath();
  let started = false;

  values.forEach((value, index) => {
    if (value == null) return;
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / (max - min)) * height;

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawSignalMarkers(ctx, signals, closes, min, max, width, height, color) {
  ctx.fillStyle = color;

  signals.forEach((index) => {
    const x = (index / (closes.length - 1)) * width;
    const y = height - ((closes[index] - min) / (max - min)) * height;
    ctx.beginPath();
    ctx.arc(x, y, 3.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCharts() {
  if (!lastResult || marketSeries.length === 0) return;

  const closes = marketSeries.map((item) => item.close);

  const pw = priceCanvas.width;
  const ph = priceCanvas.height;
  priceCtx.clearRect(0, 0, pw, ph);
  drawGrid(priceCtx, pw, ph);

  const priceBounds = seriesMinMax([
    ...closes,
    ...lastResult.fastMA.filter((v) => v != null),
    ...lastResult.slowMA.filter((v) => v != null),
  ]);

  plotLine(priceCtx, closes, "#4dd0e1", priceBounds.min, priceBounds.max, pw, ph, 2.2);
  plotLine(priceCtx, lastResult.fastMA, "#ffd166", priceBounds.min, priceBounds.max, pw, ph, 1.8);
  plotLine(priceCtx, lastResult.slowMA, "#ff8fa3", priceBounds.min, priceBounds.max, pw, ph, 1.8);

  drawSignalMarkers(priceCtx, lastResult.buySignals, closes, priceBounds.min, priceBounds.max, pw, ph, "#2ad59b");
  drawSignalMarkers(priceCtx, lastResult.sellSignals, closes, priceBounds.min, priceBounds.max, pw, ph, "#ff6f7f");

  const ew = equityCanvas.width;
  const eh = equityCanvas.height;
  equityCtx.clearRect(0, 0, ew, eh);
  drawGrid(equityCtx, ew, eh, 4);

  const equityBounds = seriesMinMax(lastResult.equityCurve);
  plotLine(equityCtx, lastResult.equityCurve, "#7ce0b7", equityBounds.min, equityBounds.max, ew, eh, 2.3);

  const startY = eh - ((10000 - equityBounds.min) / (equityBounds.max - equityBounds.min)) * eh;
  equityCtx.strokeStyle = "rgba(255,255,255,0.35)";
  equityCtx.setLineDash([6, 5]);
  equityCtx.beginPath();
  equityCtx.moveTo(0, startY);
  equityCtx.lineTo(ew, startY);
  equityCtx.stroke();
  equityCtx.setLineDash([]);
}

function refreshLabels() {
  trendValue.textContent = Number(trendInput.value).toFixed(2);
  volValue.textContent = Number(volInput.value).toFixed(1);
  regimeValue.textContent = regimeInput.value;
}

[trendInput, volInput, regimeInput].forEach((input) => {
  input.addEventListener("input", refreshLabels);
});

regenerateBtn.addEventListener("click", () => {
  generateMarket();
  backtest();
});

runBtn.addEventListener("click", () => {
  backtest();
});

refreshLabels();
generateMarket();
backtest();
