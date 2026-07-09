'use strict';

// ─── CONFIGURAÇÃO CENTRAL ────────────────────────────────────────────────────
const APP_CONFIG = {
  dias: {
    1: { url: 'pages/dia1.html', tema: 'Confiança' },
    2: { url: 'pages/dia2.html', tema: 'Gratidão' },
    3: { url: 'pages/dia3.html', tema: 'Entrega' },
    4: { url: 'pages/dia4.html', tema: 'Esperança' }
  }
};

// ─── PONTO DE ENTRADA ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupScreenTransition();
  unlockAllCards();
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

// ─── DESBLOQUEIO TOTAL ───────────────────────────────────────────────────────
/**
 * Desbloqueia todos os cartões imediatamente, sem verificação de data.
 */
function unlockAllCards() {
  for (const [num, info] of Object.entries(APP_CONFIG.dias)) {
    const card = document.getElementById(`card-day-${num}`);
    if (!card) continue;

    // Remove o estado de bloqueio
    card.classList.remove('locked');
    card.classList.add('unlocked');

    // Habilita a navegação
    card.setAttribute('href', info.url);

    // Atualiza o label do botão
    const btnLabel = card.querySelector('.card-btn');
    if (btnLabel) {
      btnLabel.textContent = 'Abrir Presente ❤️';
    }

    // Remove o blur dos textos internos
    card.querySelectorAll('.text-locked').forEach(el => {
      el.classList.remove('text-locked');
    });
  }

  // Esconde o painel de countdown, se existir
  const countdownContainer = document.getElementById('countdown-container');
  if (countdownContainer) {
    countdownContainer.style.display = 'none';
  }
}
