/* ============================================================
   NEON//CALC — logic
   ============================================================ */
(() => {
  "use strict";

  const display = document.getElementById("display");
  const history = document.getElementById("history");
  const modeTag = document.getElementById("modeTag");
  const keys = Array.from(document.querySelectorAll(".key"));
  const opKeys = Array.from(document.querySelectorAll(".key--op"));
  const clockEl = document.getElementById("clock");

  const MAX_DIGITS = 14;

  const state = {
    current: "0",   // digits being typed
    stored: null,   // left operand of pending operation
    pending: null,  // '+', '-', '*', '/'
    fresh: true,    // next digit starts a new number
    lastOp: null,   // for repeated '='
    lastOperand: null,
    error: false,
  };

  /* ---------- helpers ---------- */
  const ops = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => (b === 0 ? NaN : a / b),
  };

  const glyph = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  function fmt(n) {
    if (!isFinite(n)) return "ERR";
    // avoid exponent spam for very long decimals
    if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0)) {
      return n.toExponential(6).replace("e", "e");
    }
    const str = String(parseFloat(n.toPrecision(12)));
    const [int, dec] = str.split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return dec ? `${grouped}.${dec}` : grouped;
  }

  function render(pop = false) {
    display.textContent = state.current;
    display.classList.toggle("err", state.error);
    opKeys.forEach((k) => k.classList.remove("armed"));
    if (state.pending && !state.error) {
      const active = opKeys.find((k) => k.dataset.action === opActionName(state.pending));
      if (active) active.classList.add("armed");
    }
    if (pop) {
      display.classList.remove("pop");
      void display.offsetWidth; // restart animation
      display.classList.add("pop");
    }
  }

  function opActionName(op) {
    return { "+": "add", "-": "subtract", "*": "multiply", "/": "divide" }[op];
  }

  function setError(msg) {
    state.error = true;
    state.current = msg;
    state.stored = null;
    state.pending = null;
    state.lastOp = null;
    state.lastOperand = null;
    render(true);
    beep(180, 0.18, "sawtooth");
  }

  function clearAll() {
    Object.assign(state, {
      current: "0",
      stored: null,
      pending: null,
      fresh: true,
      lastOp: null,
      lastOperand: null,
      error: false,
    });
    history.textContent = " ";
    modeTag.textContent = "STD_MODE";
    render(true);
  }

  /* ---------- inputs ---------- */
  function inputDigit(d) {
    if (state.error) clearAll();
    if (state.fresh || state.current === "0") {
      state.current = d;
      state.fresh = false;
    } else {
      if (state.current.replace(/[-.,]/g, "").length >= MAX_DIGITS) return;
      state.current += d;
    }
    render(true);
    beep(620, 0.03, "square", 0.03);
  }

  function inputDecimal() {
    if (state.error) clearAll();
    if (state.fresh) {
      state.current = "0.";
      state.fresh = false;
    } else if (!state.current.includes(".")) {
      state.current += ".";
    }
    render(true);
    beep(480, 0.03, "square", 0.03);
  }

  function inputSign() {
    if (state.error) return;
    if (state.current === "0") return;
    state.current = state.current.startsWith("-")
      ? state.current.slice(1)
      : "-" + state.current;
    render(true);
    beep(340, 0.05, "triangle", 0.05);
  }

  function inputPercent() {
    if (state.error) return;
    const v = parseFloat(state.current);
    // 200 + 10%  -> 200 + 20 ; standalone 10% -> 0.1
    const isAdditive = state.pending === "+" || state.pending === "-";
    const next = isAdditive ? v / 100 : v / 100;
    state.current = fmt(next);
    render(true);
    beep(520, 0.05, "triangle", 0.05);
  }

  function chooseOp(op) {
    if (state.error) return;
    const value = parseFloat(state.current);

    if (state.pending !== null && !state.fresh) {
      const result = ops[state.pending](state.stored, value);
      if (!isFinite(result)) return setError("DIV/0");
      state.stored = result;
      state.current = fmt(result);
    } else {
      state.stored = value;
    }

    state.pending = op;
    state.fresh = true;
    history.textContent = `${fmt(state.stored)} ${glyph[op]}`;
    modeTag.textContent = `${glyph[op]} PENDING`;
    render(true);
    beep(760, 0.06, "sawtooth", 0.05);
  }

  function equals() {
    if (state.error) return;

    let a, b;
    if (state.pending !== null) {
      a = state.stored;
      b = parseFloat(state.current);
    } else if (state.lastOp !== null) {
      a = parseFloat(state.current);
      b = state.lastOperand;
    } else {
      modeTag.textContent = "EVAL";
      beep(700, 0.04, "square", 0.04);
      return;
    }

    const result = ops[state.pending ?? state.lastOp](a, b);
    if (!isFinite(result)) return setError("DIV/0");

    history.textContent = `${fmt(a)} ${glyph[state.pending ?? state.lastOp]} ${fmt(b)} =`;
    state.current = fmt(result);
    state.lastOp = state.pending;
    state.lastOperand = b;
    state.pending = null;
    state.stored = null;
    state.fresh = true;
    modeTag.textContent = "EVAL_DONE";
    render(true);
    beep(920, 0.09, "square", 0.06);
    setTimeout(() => beep(1180, 0.07, "square", 0.04), 70);
  }

  function clearEntry() {
    if (state.error) return clearAll();
    state.current = "0";
    state.fresh = true;
    render(true);
    beep(400, 0.05, "square", 0.05);
  }

  /* ---------- tiny synth SFX (WebAudio, no assets) ---------- */
  let audioCtx = null;
  let soundOn = false;

  function beep(freq, dur, type = "square", vol = 0.05) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (_) { /* audio unavailable — ignore */ }
  }

  document.getElementById("soundToggle").addEventListener("click", (e) => {
    soundOn = !soundOn;
    e.currentTarget.setAttribute("aria-pressed", String(soundOn));
    document.getElementById("soundLabel").textContent = soundOn ? "ON" : "OFF";
    if (soundOn) beep(880, 0.08, "square", 0.05);
  });

  /* ---------- palette toggle ---------- */
  const palettes = [
    { key: "night", label: "NIGHT", dot: "chip__led--alt" },
    { key: "matrix", label: "MATRIX", dot: "chip__led--cyan" },
    { key: "sunset", label: "SUNSET", dot: "chip__led--amber" },
  ];
  let paletteIdx = 0;

  document.getElementById("themeToggle").addEventListener("click", (e) => {
    paletteIdx = (paletteIdx + 1) % palettes.length;
    const p = palettes[paletteIdx];
    document.body.dataset.palette = p.key;
    document.getElementById("themeLabel").textContent = p.label;
    e.currentTarget.querySelector(".chip__led").className = `chip__led ${p.dot}`;
    beep(660, 0.07, "triangle", 0.05);
  });

  /* ---------- wiring ---------- */
  keys.forEach((key) => {
    key.addEventListener("click", () => {
      if (key.dataset.num !== undefined) return inputDigit(key.dataset.num);
      switch (key.dataset.action) {
        case "clear": return clearEntry();
        case "sign": return inputSign();
        case "percent": return inputPercent();
        case "add": return chooseOp("+");
        case "subtract": return chooseOp("-");
        case "multiply": return chooseOp("*");
        case "divide": return chooseOp("/");
        case "decimal": return inputDecimal();
        case "equals": return equals();
      }
    });
  });

  const keyMap = {
    "/": "divide", "*": "multiply", "-": "subtract", "+": "add",
    "Enter": "equals", "=": "equals", ".": "decimal", ",": "decimal",
    "Escape": "clear", "Delete": "clear", "Backspace": "clear",
    "%": "percent", "n": "sign", "N": "sign",
  };

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;

    if (/^[0-9]$/.test(k)) {
      e.preventDefault();
      inputDigit(k);
      return;
    }

    const action = keyMap[k];
    if (action) {
      e.preventDefault();
      const btn = keys.find((el) => el.dataset.action === action);
      btn?.click();
    }
  });

  /* ---------- ambience: clock + fake CPU ---------- */
  const pad = (n) => String(n).padStart(2, "0");

  function tickClock() {
    const d = new Date();
    clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function tickCpu() {
    const load = 8 + Math.floor(Math.random() * 26);
    document.getElementById("cpuLoad").textContent = `CPU ${load}%`;
    document.querySelector(".cpu i").style.setProperty("--w", `${load + 30}%`);
  }

  setInterval(tickClock, 1000);
  setInterval(tickCpu, 2200);
  tickClock();
  tickCpu();
  render();
})();