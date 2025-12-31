'use strict';

/**
 * Calculadora sem eval():
 * Modelo de estado "left op right".
 * - left: acumulador
 * - op: operador atual
 * - input: string do número sendo digitado (right)
 * - lastRight: último operando direito (para repetir "=")
 *
 * Porcentagem estilo calculadora:
 * - Para + e −: percent vira "base * (p/100)" onde base = left
 * - Para × e ÷: percent vira "(p/100)" como fração
 *
 * Ex.: 50 + 10% => 50 + (50*0.10) = 55
 *      50 × 10% => 50 × (0.10) = 5
 *      50 ÷ 10% => 50 ÷ (0.10) = 500
 */

const mainDisplay = document.getElementById('mainDisplay');
const subDisplay = document.getElementById('subDisplay');
const keys = document.querySelector('.keys');

const OPS = new Set(['+', '−', '×', '÷']);

const state = {
  left: null,        // number | null
  op: null,          // string | null
  input: '0',        // string number being typed
  lastRight: null,   // number | null
  justEvaluated: false,
  error: false
};

function isDigitChar(ch) {
  return ch >= '0' && ch <= '9';
}

function normalizeNumber(n) {
  // Estratégia simples: arredondar a 12 casas e remover "-0".
  // Ajuda muito em casos como 0.1 + 0.2.
  const rounded = Math.round((n + Number.EPSILON) * 1e12) / 1e12;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return 'Erro';
  const normalized = normalizeNumber(n);

  // Evitar notação científica em casos comuns, mas sem complicar.
  // Para números muito grandes/pequenos, fallback para String().
  const abs = Math.abs(normalized);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
    return String(normalized);
  }

  // Converte e remove zeros à direita em decimais.
  let s = normalized.toString();
  if (s.includes('e')) return s;

  if (s.includes('.')) {
    s = s.replace(/\.?0+$/, '');
  }
  return s;
}

function setError() {
  state.error = true;
  state.left = null;
  state.op = null;
  state.input = 'Erro';
  state.lastRight = null;
  state.justEvaluated = false;
  render();
}

function resetAll() {
  state.left = null;
  state.op = null;
  state.input = '0';
  state.lastRight = null;
  state.justEvaluated = false;
  state.error = false;
  render();
}

function render() {
  if (state.error) {
    subDisplay.textContent = 'Divisão por zero ou operação inválida';
    mainDisplay.textContent = 'Erro';
    return;
  }

  mainDisplay.textContent = state.input;

  const leftText = state.left === null ? '' : formatNumber(state.left);
  const opText = state.op ? state.op : '';
  const rightText = (state.op && state.input !== '0') ? state.input : '';

  const expr = [leftText, opText, rightText].filter(Boolean).join(' ');
  subDisplay.textContent = expr;
}

function parseInput() {
  // Converte string para número de forma segura.
  // Aceita "0", "-0", "12.", "12.3"
  if (state.input === 'Erro') return NaN;
  const n = Number(state.input);
  return Number.isFinite(n) ? n : NaN;
}

function startNewInputWith(valueStr) {
  state.input = valueStr;
}

function appendDigit(d) {
  if (state.error) return;

  if (state.justEvaluated && state.op === null) {
    // Se acabou de avaliar e começa a digitar, inicia novo cálculo.
    state.left = null;
    state.lastRight = null;
    state.justEvaluated = false;
    state.input = '0';
  }

  if (state.input === '0') {
    state.input = d;
  } else if (state.input === '-0') {
    state.input = '-' + d;
  } else {
    state.input += d;
  }
  render();
}

function appendDot() {
  if (state.error) return;

  if (state.justEvaluated && state.op === null) {
    state.left = null;
    state.lastRight = null;
    state.justEvaluated = false;
    state.input = '0';
  }

  if (!state.input.includes('.')) {
    state.input += '.';
  }
  render();
}

function deleteLast() {
  if (state.error) return;

  if (state.justEvaluated && state.op === null) {
    // Após "=", DEL apenas mantém o resultado (comportamento simples).
    render();
    return;
  }

  if (state.input.length <= 1) {
    state.input = '0';
  } else if (state.input.length === 2 && state.input.startsWith('-')) {
    state.input = '0';
  } else {
    state.input = state.input.slice(0, -1);
    if (state.input === '-' || state.input === '-0') state.input = '0';
  }
  render();
}

function toggleSign() {
  if (state.error) return;

  if (state.input === '0') {
    state.input = '-0';
  } else if (state.input === '-0') {
    state.input = '0';
  } else if (state.input.startsWith('-')) {
    state.input = state.input.slice(1);
  } else {
    state.input = '-' + state.input;
  }
  render();
}

function compute(left, op, right) {
  // Retorna number ou null para erro.
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;

  let result;
  if (op === '+') result = left + right;
  else if (op === '−') result = left - right;
  else if (op === '×') result = left * right;
  else if (op === '÷') {
    if (right === 0) return null;
    result = left / right;
  } else {
    return null;
  }

  return normalizeNumber(result);
}

function commitOperator(nextOp) {
  if (state.error) return;
  if (!OPS.has(nextOp)) return;

  const current = parseInput();
  if (!Number.isFinite(current)) return setError();

  if (state.left === null) {
    state.left = current;
    state.op = nextOp;
    state.input = '0';
    state.justEvaluated = false;
    render();
    return;
  }

  if (state.op === null) {
    state.op = nextOp;
    state.input = '0';
    state.justEvaluated = false;
    render();
    return;
  }

  // Se já existe left e op, ao pressionar outro op:
  // - Se input ainda é 0 e usuário só quer trocar operador: troca e pronto.
  // - Caso contrário, resolve operação pendente e define o próximo operador.
  if (state.input === '0') {
    state.op = nextOp;
    render();
    return;
  }

  const result = compute(state.left, state.op, current);
  if (result === null) return setError();

  state.left = result;
  state.op = nextOp;
  state.input = '0';
  state.justEvaluated = false;
  state.lastRight = null;
  render();
}

function applyPercent() {
  if (state.error) return;

  const p = parseInput();
  if (!Number.isFinite(p)) return setError();

  // Sem operador: trata como "p%" => p/100 (comportamento comum)
  if (state.left === null || state.op === null) {
    const value = normalizeNumber(p / 100);
    state.input = formatNumber(value);
    state.justEvaluated = false;
    render();
    return;
  }

  const base = state.left;
  let right;

  // Padrão de calculadora
  if (state.op === '+' || state.op === '−') {
    right = normalizeNumber(base * (p / 100));
  } else {
    right = normalizeNumber(p / 100);
  }

  state.input = formatNumber(right);
  state.justEvaluated = false;
  render();
}

function evaluate() {
  if (state.error) return;

  // Caso: apenas número digitado, sem operador
  if (state.op === null) {
    state.justEvaluated = true;
    render();
    return;
  }

  // Se left está ausente, tenta usar o input como left (fallback)
  if (state.left === null) {
    const current = parseInput();
    if (!Number.isFinite(current)) return setError();
    state.left = current;
    state.justEvaluated = true;
    render();
    return;
  }

  let right;

  // Repetição do "=":
  // Se input está "0" (estado limpo após operador), usa lastRight se existir, senão usa left.
  if (state.input === '0') {
    right = state.lastRight !== null ? state.lastRight : state.left;
  } else {
    const current = parseInput();
    if (!Number.isFinite(current)) return setError();
    right = current;
  }

  const result = compute(state.left, state.op, right);
  if (result === null) return setError();

  state.left = result;
  state.input = formatNumber(result);
  state.lastRight = right;
  state.justEvaluated = true;
  render();
}

function onButtonAction(action, value) {
  if (action !== 'ac' && state.error) {
    // Em erro: somente AC funciona.
    return;
  }

  if (action === 'digit') return appendDigit(value);
  if (action === 'dot') return appendDot();
  if (action === 'del') return deleteLast();
  if (action === 'ac') return resetAll();
  if (action === 'sign') return toggleSign();
  if (action === 'percent') return applyPercent();
  if (action === 'op') return commitOperator(value);
  if (action === 'eq') return evaluate();
}

keys.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.getAttribute('data-action');
  const value = btn.getAttribute('data-value') || '';
  onButtonAction(action, value);
});

document.addEventListener('keydown', (e) => {
  const key = e.key;

  // Em erro: só Escape (AC) funciona para resetar
  if (state.error && key !== 'Escape') return;

  if (isDigitChar(key)) {
    e.preventDefault();
    return appendDigit(key);
  }

  if (key === '.' || key === ',') {
    // vírgula vira ponto (prático em PT-BR)
    e.preventDefault();
    return appendDot();
  }

  if (key === 'Backspace') {
    e.preventDefault();
    return deleteLast();
  }

  if (key === 'Escape') {
    e.preventDefault();
    return resetAll();
  }

  if (key === 'Enter' || key === '=') {
    e.preventDefault();
    return evaluate();
  }

  if (key === '%') {
    e.preventDefault();
    return applyPercent();
  }

  // Operadores do teclado
  if (key === '+') {
    e.preventDefault();
    return commitOperator('+');
  }
  if (key === '-') {
    e.preventDefault();
    return commitOperator('−');
  }
  if (key === '*') {
    e.preventDefault();
    return commitOperator('×');
  }
  if (key === '/') {
    e.preventDefault();
    return commitOperator('÷');
  }
});

resetAll();
