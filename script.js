/**
 * ============================================================
 *  QUATRO DIAS — Sistema de Desbloqueio Automático por Data
 * ============================================================
 *
 * COMO FUNCIONA:
 *  1. Ao carregar, tentamos obter a hora oficial via API da internet
 *     (WorldTimeAPI com fallback para TimeAPI.io).
 *  2. Capturamos o offset entre o relógio interno do navegador
 *     (performance.now) e a hora da API — isso torna a hora
 *     resistente a alterações manuais do relógio durante a sessão.
 *  3. Um loop de 1 segundo avalia quais cartões devem ser
 *     desbloqueados e atualiza a contagem regressiva.
 *
 * PARA TESTAR LOCALMENTE:
 *  Altere as dateString abaixo para datas já passadas, por ex:
 *    '2026-07-01T00:00:00-03:00'
 *  Isso fará o cartão aparecer como desbloqueado imediatamente.
 * ============================================================
 */

'use strict';

// ─── CONFIGURAÇÃO CENTRAL ────────────────────────────────────────────────────
// Altere apenas aqui para atualizar datas ou URLs de cada dia.
// Atenção: use o offset -03:00 (Brasília) para que a comparação
// seja feita no horário correto, independente do fuso do dispositivo.
const APP_CONFIG = {

  /** APIs consultadas em ordem. Se a primeira falhar, tenta a próxima. */
  timeApis: [
    'https://worldtimeapi.org/api/timezone/America/Sao_Paulo',
    'https://timeapi.io/api/time/current/zone?timeZone=America%2FSao_Paulo'
  ],

  /** Timeout máximo por tentativa de API (ms) */
  apiTimeoutMs: 4000,

  /** Cronograma oficial — edite apenas aqui para ajustar datas */
  dias: {
    1: { dateString: '2026-07-09T07:00:00-03:00', url: 'pages/dia1.html', tema: 'Confiança' },
    2: { dateString: '2026-07-10T07:00:00-03:00', url: 'pages/dia2.html', tema: 'Gratidão' },
    3: { dateString: '2026-07-11T07:00:00-03:00', url: 'pages/dia3.html', tema: 'Entrega' },
    4: { dateString: '2026-07-12T07:00:00-03:00', url: 'pages/dia4.html', tema: 'Esperança' }
  }
};

// ─── ESTADO INTERNO ──────────────────────────────────────────────────────────
/** Timestamp em ms da hora sincronizada com a API */
let syncedTimeMs = null;

/** Valor de performance.now() no momento da sincronização */
let syncedPerfMs = null;

/** Flag: enquanto true, suprime as animações de desbloqueio (evita flash no load) */
let isSilentLoad = true;

// ─── PONTO DE ENTRADA ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupScreenTransition();
  setupCardClickBlocker();
  syncTimeAndBegin();
});

// ─── TRANSIÇÃO ENTRE TELAS ───────────────────────────────────────────────────
/**
 * Configura o botão "Entrar" para fazer a transição
 * suave da tela de boas-vindas para a grade de cartões.
 */
function setupScreenTransition() {
  const btnEnter = document.getElementById('btn-enter');
  const screenIntro = document.getElementById('screen-intro');
  const screenDays = document.getElementById('screen-days');

  if (!btnEnter || !screenIntro || !screenDays) return;

  btnEnter.addEventListener('click', () => {
    screenIntro.classList.add('fade-out');

    setTimeout(() => {
      screenIntro.classList.remove('active', 'fade-out');
      screenDays.classList.add('active');
    }, 500);
  });
}

// ─── BLOQUEIO DE CLIQUE NOS CARTÕES TRANCADOS ────────────────────────────────
/**
 * Previne que um toque/clique em cartão bloqueado navegue para qualquer URL.
 * O href="#" é mantido no HTML apenas por acessibilidade semântica;
 * aqui nós cancelamos o comportamento padrão.
 */
function setupCardClickBlocker() {
  document.querySelectorAll('.day-card').forEach(card => {
    card.addEventListener('click', e => {
      if (card.classList.contains('locked')) {
        e.preventDefault();
      }
    });
  });
}

// ─── SINCRONIZAÇÃO DE HORA ───────────────────────────────────────────────────
/**
 * Tenta buscar a hora oficial em cada URL configurada, em sequência.
 * Se todas falharem, usa o relógio local do dispositivo como fallback.
 *
 * @returns {Promise<Date>}
 */
async function fetchInternetTime() {
  for (const apiUrl of APP_CONFIG.timeApis) {
    try {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), APP_CONFIG.apiTimeoutMs);

      const response = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timerId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // WorldTimeAPI: { datetime: "2026-07-09T01:23:45.000000-03:00" }
      if (data && data.datetime) {
        console.log(`[Hora] Sincronizado via WorldTimeAPI: ${data.datetime}`);
        return new Date(data.datetime);
      }

      // TimeAPI.io: { dateTime: "2026-07-09T01:23:45.000000" }
      if (data && data.dateTime) {
        // TimeAPI retorna hora de Brasília sem offset — adicionamos -03:00
        const isoString = data.dateTime.split('.')[0] + '-03:00';
        console.log(`[Hora] Sincronizado via TimeAPI.io: ${isoString}`);
        return new Date(isoString);
      }

      throw new Error('Formato de resposta desconhecido.');

    } catch (err) {
      console.warn(`[Hora] Falha em ${apiUrl}: ${err.message}`);
    }
  }

  // Fallback: usa relógio do dispositivo
  console.warn('[Hora] Usando relógio local do dispositivo como fallback.');
  return new Date();
}

/**
 * Orquestra a sincronização e inicia o loop de verificação de 1 segundo.
 */
async function syncTimeAndBegin() {
  const serverTime = await fetchInternetTime();

  // Salva o âncora de tempo para calcular a hora corrente a qualquer momento
  syncedTimeMs = serverTime.getTime();
  syncedPerfMs = performance.now();

  // Primeira avaliação (silenciosa — sem animações)
  tick();

  // Libera animações para as próximas verificações
  isSilentLoad = false;

  // Loop de 1 segundo
  setInterval(tick, 1000);
}

// ─── HORA CORRIGIDA ──────────────────────────────────────────────────────────
/**
 * Retorna a hora atual corrigida.
 * Ao usar performance.now() (que não pode ser manipulado pelo usuário),
 * somamos o tempo decorrido à hora obtida da API, tornando o sistema
 * resistente a alterações manuais do relógio durante a sessão.
 *
 * @returns {Date}
 */
function getNow() {
  if (syncedTimeMs === null) return new Date();
  const elapsed = performance.now() - syncedPerfMs;
  return new Date(syncedTimeMs + elapsed);
}

// ─── LOOP PRINCIPAL ──────────────────────────────────────────────────────────
/**
 * Executado a cada 1 segundo.
 * Avalia o estado de cada cartão e atualiza a contagem regressiva.
 */
function tick() {
  const now = getNow();
  let nextUnlockDate = null; // data do próximo desbloqueio (para o countdown)

  for (const [num, info] of Object.entries(APP_CONFIG.dias)) {
    const card = document.getElementById(`card-day-${num}`);
    const unlockDate = new Date(info.dateString);

    if (!card) continue;

    if (now >= unlockDate) {
      // ✅ Hora de desbloquear
      unlockCard(card, info.url);
    } else {
      // 🔒 Ainda bloqueado — candidate para o countdown
      if (nextUnlockDate === null) {
        nextUnlockDate = unlockDate;
      }
    }
  }

  renderCountdown(now, nextUnlockDate);
}

// ─── DESBLOQUEIO DO CARTÃO ───────────────────────────────────────────────────
/**
 * Muda o cartão de "locked" para "unlocked" e atualiza seu conteúdo.
 * A animação de desbloqueio só dispara se não for o carregamento inicial.
 *
 * @param {HTMLElement} card
 * @param {string}      url   - URL da página do dia
 */
function unlockCard(card, url) {
  // Já está desbloqueado — não faz nada
  if (!card.classList.contains('locked')) return;

  // Troca as classes
  card.classList.remove('locked');
  card.classList.add('unlocked');

  // Habilita a navegação
  card.setAttribute('href', url);

  // Atualiza o label do botão
  const btnLabel = card.querySelector('.card-btn');
  if (btnLabel) {
    btnLabel.textContent = 'Abrir Presente ❤️';
  }

  // Remove o blur dos textos internos
  card.querySelectorAll('.text-locked').forEach(el => {
    el.classList.remove('text-locked');
  });

  // Anima apenas se não for o carregamento silencioso
  if (!isSilentLoad) {
    triggerUnlockAnimation(card);
  }
}

/**
 * Aplica a animação de desbloqueio no cartão e a remove ao fim.
 *
 * @param {HTMLElement} card
 */
function triggerUnlockAnimation(card) {
  card.classList.add('unlocking');
  card.addEventListener('animationend', () => {
    card.classList.remove('unlocking');
  }, { once: true });
}

// ─── CONTAGEM REGRESSIVA ─────────────────────────────────────────────────────
/**
 * Atualiza o painel de contagem regressiva.
 * - Esconde o painel quando todos os dias estiverem liberados.
 * - Mostra o tempo restante até o próximo desbloqueio.
 *
 * @param {Date}      now             - hora atual corrigida
 * @param {Date|null} nextUnlockDate  - data do próximo desbloqueio, ou null se todos liberados
 */
function renderCountdown(now, nextUnlockDate) {
  const container = document.getElementById('countdown-container');
  const timerEl = document.getElementById('countdown-timer');

  if (!container || !timerEl) return;

  // Todos liberados → esconde
  if (nextUnlockDate === null) {
    container.style.display = 'none';
    return;
  }

  const diffMs = nextUnlockDate - now;

  // Já passou (próxima iteração vai desbloquear) → mostra zero
  if (diffMs <= 0) {
    timerEl.textContent = '0d 00h 00m 00s';
    container.style.display = 'flex';
    return;
  }

  const d = Math.floor(diffMs / 86_400_000);
  const h = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  const s = Math.floor((diffMs % 60_000) / 1_000);

  const pad = n => String(n).padStart(2, '0');

  timerEl.textContent = `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  container.style.display = 'flex';
}
