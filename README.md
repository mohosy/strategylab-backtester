# StrategyLab Backtester

A front-end quant finance project that generates synthetic market regimes and evaluates a moving-average crossover strategy with institutional-style performance metrics.

## Highlights
- Synthetic OHLC market generation with trend, volatility, and regime controls.
- Fully in-browser backtest engine (no libraries, no API calls).
- Price chart with fast/slow SMA overlays and buy/sell signal markers.
- Equity curve visualization with baseline reference.
- Metrics: total return, Sharpe ratio, max drawdown, win rate, trades, final equity.

## Tech
- HTML5 Canvas for charting
- Vanilla JavaScript for simulation/backtesting logic
- Modern CSS dashboard layout

## Run
1. Open `index.html` in a browser.
2. Tune market generator and strategy settings.
3. Click **Run Backtest** to evaluate performance.
