/**
 * app.js — 아진이의 영어 단어장 메인 앱 로직
 * Handles state, session building, quiz flow, and screen rendering.
 */

// ===== CONSTANTS =====
const STORAGE_KEYS = {
  PROGRESS: 'ajin_progress_v2',
  SESSION:  'ajin_session_v2',
  SETTINGS: 'ajin_settings_v2',
  STREAK:   'ajin_streak_v2'
};

const POS_KO = { noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사' };
const POS_BADGE = { noun: 'badge-noun', verb: 'badge-verb', adjective: 'badge-adjective', adverb: 'badge-adverb' };

// ===== STATE =====
let vocab    = [];
let progress = {};   // { [wordId]: SRS progress object }
let session  = null; // today's session
let settings = { dailyNew: 3, dailyReview: 5 };
let streakInfo = { count: 0, lastDate: null };
let currentScreen = 'home';

// ===== UTILS =====
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function saveAll() {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    localStorage.setItem(STORAGE_KEYS.SESSION,  JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEYS.STREAK,   JSON.stringify(streakInfo));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

function loadAll() {
  try {
    const p = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (p) progress = JSON.parse(p);

    const s = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed && parsed.date === todayStr()) session = parsed;
    }

    const st = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (st) settings = { ...settings, ...JSON.parse(st) };

    const sk = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (sk) streakInfo = JSON.parse(sk);
  } catch (e) {
    console.warn('localStorage load failed, resetting:', e);
    progress = {};  session = null;
  }
}

function getProgress(wordId) {
  if (!progress[wordId]) progress[wordId] = SRS.getInitial();
  return progress[wordId];
}

// ===== STREAK =====
function computeStreak() {
  const today = todayStr();
  if (!streakInfo.lastDate) return;
  if (streakInfo.lastDate === today) return; // already updated today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  if (streakInfo.lastDate !== yStr) {
    // Streak broken
    streakInfo.count = 0;
  }
}

function markStudiedToday() {
  const today = todayStr();
  if (streakInfo.lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    if (streakInfo.lastDate === yStr) {
      streakInfo.count += 1;
    } else {
      streakInfo.count = 1;
    }
    streakInfo.lastDate = today;
  }
}

// ===== SESSION BUILDING =====
function buildSession() {
  if (session && session.date === todayStr()) return; // already built today

  const today = todayStr();

  // New words: not yet learned
  const notLearned = vocab.filter(w => {
    const prog = progress[w.id];
    return !prog || !prog.learned;
  });
  const newWords = notLearned.slice(0, settings.dailyNew);

  // Review words: learned and due
  const dueWords = vocab.filter(w => {
    const prog = progress[w.id];
    return prog && prog.learned && prog.dueDate && prog.dueDate <= today;
  }).sort((a, b) => progress[a.id].dueDate.localeCompare(progress[b.id].dueDate));
  const reviewWords = dueWords.slice(0, settings.dailyReview);

  // Build queue
  // New words: intro phase → quiz phase
  // Review words: quiz only
  const queue = [];
  for (const w of newWords) {
    queue.push({ wordId: w.id, phase: 'intro' });
    queue.push({ wordId: w.id, phase: 'quiz' });
  }
  for (const w of reviewWords) {
    queue.push({ wordId: w.id, phase: 'quiz' });
  }

  session = {
    date: today,
    newWordIds: newWords.map(w => w.id),
    reviewWordIds: reviewWords.map(w => w.id),
    queue,
    currentIndex: 0,
    wrongIds: [],          // wrong in main quiz
    completed: false,
    retryQueue: [],        // for retry mode
    retryIndex: 0,
    inRetry: false,
    retryWrongIds: [],
    correctCount: 0,
    totalQuizCount: 0
  };

  saveAll();
}

function generateChoices(correctWordId, count = 4) {
  const correctWord = vocab.find(w => w.id === correctWordId);
  if (!correctWord) return [];

  const others = shuffle(vocab.filter(w => w.id !== correctWordId))
    .slice(0, count - 1);

  return shuffle([
    { meaning: correctWord.meaningKo, isCorrect: true  },
    ...others.map(w => ({ meaning: w.meaningKo, isCorrect: false }))
  ]);
}

// ===== SCREEN ROUTING =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');

  // Update bottom nav
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });

  // Show/hide header
  const header = document.querySelector('.app-header');
  if (header) header.style.display = (name === 'study') ? 'none' : '';

  currentScreen = name;
}

// ===== HOME SCREEN =====
function renderHome() {
  const today = new Date();
  const dateEl = document.getElementById('home-date');
  if (dateEl) {
    dateEl.textContent = today.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  }

  // Streak
  computeStreak();
  const streakEl = document.getElementById('streak-count');
  const streakMsg = document.getElementById('streak-msg');
  if (streakEl) streakEl.textContent = streakInfo.count;
  if (streakMsg) {
    streakMsg.textContent = streakInfo.count === 0
      ? '오늘 첫 시작이에요!'
      : `${streakInfo.count}일 연속 학습 중!`;
  }

  // Build session counts
  buildSession();

  const newCount = session.newWordIds.length;
  const reviewCount = session.reviewWordIds.length;

  const newEl = document.getElementById('today-new-count');
  const revEl = document.getElementById('today-review-count');
  if (newEl) newEl.textContent = newCount;
  if (revEl) revEl.textContent = reviewCount;

  // Start button
  const startBtn = document.getElementById('btn-start-study');
  const doneMsgEl = document.getElementById('session-done-msg');
  if (startBtn && doneMsgEl) {
    if (session.completed) {
      startBtn.disabled = true;
      startBtn.textContent = '✅ 오늘 학습 완료!';
      doneMsgEl.style.display = 'block';
      doneMsgEl.textContent = '잘했어요! 내일 또 새 단어가 기다리고 있어요 🌟';
    } else if (newCount === 0 && reviewCount === 0) {
      startBtn.disabled = true;
      startBtn.textContent = '오늘 학습할 단어가 없어요';
      doneMsgEl.style.display = 'block';
      doneMsgEl.textContent = '모든 단어를 잘 외웠어요! 👏';
    } else {
      startBtn.disabled = false;
      startBtn.textContent = `📚 오늘 학습 시작하기 (${newCount + reviewCount}개)`;
      doneMsgEl.style.display = 'none';
    }
  }

  // Overall progress
  const learnedCount = vocab.filter(w => progress[w.id]?.learned).length;
  const totalCount = vocab.length;
  const pctEl = document.getElementById('progress-pct-text');
  const fillEl = document.getElementById('progress-bar-fill');
  if (pctEl) pctEl.textContent = `${learnedCount} / ${totalCount}`;
  if (fillEl) fillEl.style.width = `${Math.round(learnedCount / totalCount * 100)}%`;
}

// ===== STUDY FLOW =====
function startStudy() {
  if (session.completed) return;
  session.inRetry = false;
  showScreen('study');
  renderCurrentCard();
}

function renderStudyProgress() {
  const queue = session.inRetry ? session.retryQueue : session.queue;
  const idx   = session.inRetry ? session.retryIndex : session.currentIndex;
  const total = queue.length;
  const done  = idx;

  const fill = document.getElementById('study-progress-fill');
  const counter = document.getElementById('study-counter');
  if (fill) fill.style.width = `${total ? Math.round(done / total * 100) : 0}%`;
  if (counter) counter.textContent = `${done}/${total}`;
}

function renderCurrentCard() {
  const queue = session.inRetry ? session.retryQueue : session.queue;
  const idx   = session.inRetry ? session.retryIndex : session.currentIndex;

  renderStudyProgress();

  if (idx >= queue.length) {
    if (session.inRetry) {
      renderRetryComplete();
    } else {
      renderSessionComplete();
    }
    return;
  }

  const item = queue[idx];
  const word = vocab.find(w => w.id === item.wordId);
  if (!word) { advanceCard(); return; }

  const content = document.getElementById('study-content');
  if (!content) return;

  if (item.phase === 'intro') {
    content.innerHTML = buildIntroCardHTML(word);
    content.querySelector('.btn-next')?.addEventListener('click', advanceCard);
    content.querySelector('.btn-tts')?.addEventListener('click', () => TTS.speak(word.word));
  } else {
    const choices = generateChoices(word.id, 4);
    content.innerHTML = buildQuizCardHTML(word, choices);
    content.querySelector('.btn-tts')?.addEventListener('click', () => TTS.speak(word.word));
    content.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(word.id, btn.dataset.correct === 'true', btn));
    });
  }
}

function buildIntroCardHTML(word) {
  const posKo = POS_KO[word.partOfSpeech] || word.partOfSpeech;
  const posBadge = POS_BADGE[word.partOfSpeech] || '';

  const examplesHTML = (word.examples || []).map(ex => `
    <div class="example-item">
      <div class="ex-en">"${ex.en}"</div>
      <div class="ex-ko">${ex.ko}</div>
    </div>
  `).join('');

  return `
    <div class="word-intro-card">
      <div class="word-intro-tag">✨ 새 단어</div>
      <div class="word-intro-english">${escHtml(word.word)}</div>
      <div class="word-intro-pos-row">
        <span class="badge ${posBadge}">${posKo}</span>
        <button class="btn-tts" aria-label="발음 듣기">🔊</button>
      </div>
      <div class="word-intro-divider"></div>
      <div class="word-intro-meaning">${escHtml(word.meaningKo)}</div>
      <div class="word-intro-examples">${examplesHTML}</div>
    </div>
    <button class="btn-next">다음으로 →</button>
  `;
}

function buildQuizCardHTML(word, choices) {
  const choicesHTML = choices.map(c => `
    <button class="choice-btn" data-correct="${c.isCorrect}" aria-label="${c.meaning}">
      ${escHtml(c.meaning)}
    </button>
  `).join('');

  return `
    <div class="quiz-card">
      <div class="quiz-prompt">무슨 뜻일까요? 🤔</div>
      <div class="quiz-word">${escHtml(word.word)}</div>
      <div class="quiz-tts-row">
        <button class="btn-tts" aria-label="발음 듣기">🔊</button>
      </div>
    </div>
    <div class="choices-grid">${choicesHTML}</div>
  `;
}

function handleAnswer(wordId, isCorrect, clickedBtn) {
  // Disable all choices
  const allBtns = document.querySelectorAll('.choice-btn');
  allBtns.forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('correct');
  });
  if (!isCorrect) clickedBtn.classList.add('wrong');

  // Update SRS
  const prog = getProgress(wordId);
  SRS.update(prog, isCorrect);
  progress[wordId] = prog;

  // Track stats
  if (!session.inRetry) {
    session.totalQuizCount += 1;
    if (isCorrect) {
      session.correctCount += 1;
    } else {
      if (!session.wrongIds.includes(wordId)) session.wrongIds.push(wordId);
    }
  } else {
    if (!isCorrect) {
      if (!session.retryWrongIds.includes(wordId)) session.retryWrongIds.push(wordId);
    }
  }

  saveAll();

  // Show result card after short delay
  setTimeout(() => showResultCard(wordId, isCorrect), 380);
}

function showResultCard(wordId, isCorrect) {
  const word = vocab.find(w => w.id === wordId);
  if (!word) { advanceCard(); return; }

  const content = document.getElementById('study-content');
  if (!content) return;

  const examplesHTML = (word.examples || []).slice(0, 2).map(ex => `
    <div class="example-item">
      <div class="ex-en">"${ex.en}"</div>
      <div class="ex-ko">${ex.ko}</div>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="result-card" style="border-top: 4px solid ${isCorrect ? 'var(--success)' : 'var(--error)'}">
      <div class="result-header">
        <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
        <span class="result-title" style="color: ${isCorrect ? 'var(--success)' : 'var(--error)'}">
          ${isCorrect ? randomPraise() : '다음엔 맞힐 수 있어요!'}
        </span>
      </div>
      <div class="result-word-row">
        <span class="result-word">${escHtml(word.word)}</span>
        <span style="color: var(--text-light);">=</span>
        <span class="result-meaning">${escHtml(word.meaningKo)}</span>
        <button class="btn-tts" aria-label="발음 듣기">🔊</button>
      </div>
      <div class="result-examples">${examplesHTML}</div>
    </div>
    <button class="btn-next" id="btn-next-card">
      ${isNextLast() ? '결과 보기 🎉' : '다음 →'}
    </button>
  `;

  content.querySelector('.btn-tts')?.addEventListener('click', () => TTS.speak(word.word));
  document.getElementById('btn-next-card')?.addEventListener('click', advanceCard);
}

function isNextLast() {
  if (session.inRetry) return session.retryIndex + 1 >= session.retryQueue.length;
  return session.currentIndex + 1 >= session.queue.length;
}

function advanceCard() {
  if (session.inRetry) {
    session.retryIndex += 1;
  } else {
    session.currentIndex += 1;
  }
  saveAll();
  renderCurrentCard();
}

function renderSessionComplete() {
  session.completed = true;
  markStudiedToday();
  saveAll();

  const total = session.totalQuizCount;
  const correct = session.correctCount;
  const accuracy = total > 0 ? Math.round(correct / total * 100) : 100;
  const wrongCount = session.wrongIds.length;

  const content = document.getElementById('study-content');
  if (!content) return;

  let emoji = '🌟';
  let title = '훌륭해요!';
  let subtitle = '오늘도 열심히 공부했어요!';

  if (accuracy === 100) {
    emoji = '🏆'; title = '완벽해요!'; subtitle = '모든 문제를 맞혔어요! 대단해요!';
  } else if (accuracy >= 80) {
    emoji = '🌟'; title = '잘했어요!'; subtitle = '거의 다 맞혔어요. 조금만 더 연습해요!';
  } else if (accuracy >= 50) {
    emoji = '💪'; title = '수고했어요!'; subtitle = '틀린 단어를 다시 복습해봐요!';
  } else {
    emoji = '📖'; title = '계속 연습해요!'; subtitle = '처음엔 어렵지만 반복하면 기억할 수 있어요!';
  }

  const retryBtnHTML = wrongCount > 0
    ? `<button class="btn-retry" id="btn-retry-wrong">❌ 틀린 ${wrongCount}개 다시 풀기</button>`
    : '';

  content.innerHTML = `
    <div class="session-complete">
      <div class="complete-emoji">${emoji}</div>
      <div class="complete-title">${title}</div>
      <div class="complete-subtitle">${subtitle}</div>
      <div class="complete-stats">
        <div class="complete-stat">
          <div class="cn">${correct}</div>
          <div class="cl">정답</div>
        </div>
        <div class="complete-stat">
          <div class="cn">${total - correct}</div>
          <div class="cl">오답</div>
        </div>
        <div class="complete-stat">
          <div class="cn">${accuracy}%</div>
          <div class="cl">정확도</div>
        </div>
      </div>
      ${retryBtnHTML}
      <button class="btn-home" id="btn-go-home">🏠 홈으로 돌아가기</button>
    </div>
  `;

  renderStudyProgress();

  document.getElementById('btn-go-home')?.addEventListener('click', () => {
    showScreen('home');
    renderHome();
  });

  document.getElementById('btn-retry-wrong')?.addEventListener('click', () => {
    startRetryMode(session.wrongIds);
  });
}

function renderRetryComplete() {
  const wrongCount = session.retryWrongIds.length;
  const content = document.getElementById('study-content');
  if (!content) return;

  const emoji = wrongCount === 0 ? '🎉' : '💪';
  const title = wrongCount === 0 ? '모두 맞혔어요!' : '계속 연습해요!';

  content.innerHTML = `
    <div class="session-complete">
      <div class="complete-emoji">${emoji}</div>
      <div class="complete-title">${title}</div>
      <div class="complete-subtitle">
        ${wrongCount === 0
          ? '틀렸던 단어를 모두 정복했어요! 🏆'
          : `아직 ${wrongCount}개가 남아있어요. 계속 복습하면 꼭 외울 수 있어요!`}
      </div>
      <button class="btn-home" id="btn-retry-home">🏠 홈으로 돌아가기</button>
    </div>
  `;

  renderStudyProgress();

  document.getElementById('btn-retry-home')?.addEventListener('click', () => {
    showScreen('home');
    renderHome();
  });
}

function startRetryMode(wordIds) {
  if (!wordIds || wordIds.length === 0) return;
  session.inRetry = true;
  session.retryIndex = 0;
  session.retryWrongIds = [];
  session.retryQueue = wordIds.map(id => ({ wordId: id, phase: 'quiz' }));
  saveAll();
  renderCurrentCard();
}

function randomPraise() {
  const praises = ['정답!', '완벽해요! 🎉', '맞았어요!', '훌륭해요! ⭐', '잘했어요! 👏'];
  return praises[Math.floor(Math.random() * praises.length)];
}

// ===== WORD LIST SCREEN =====
function renderWordList(filter = '') {
  const container = document.getElementById('wordlist-items');
  if (!container) return;

  const learned  = vocab.filter(w => progress[w.id]?.learned);
  const filtered = filter
    ? learned.filter(w =>
        w.word.toLowerCase().includes(filter.toLowerCase()) ||
        w.meaningKo.includes(filter))
    : learned;

  const countEl = document.getElementById('wordlist-count');
  if (countEl) countEl.textContent = `학습한 단어 ${learned.length}개`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${filter ? '🔍' : '📚'}</div>
        <p>${filter ? '검색 결과가 없어요.' : '아직 학습한 단어가 없어요.\n오늘 학습을 시작해봐요!'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(w => {
    const prog = progress[w.id];
    const due = prog?.dueDate;
    const streak = prog?.streak || 0;
    const today = todayStr();
    const isDue = due && due <= today;
    return `
      <div class="word-item" data-id="${w.id}" role="button" tabindex="0">
        <div class="word-item-left">
          <div class="word-item-en">${escHtml(w.word)}</div>
          <div class="word-item-ko">${escHtml(w.meaningKo)}</div>
        </div>
        <div class="word-item-right">
          ${streak > 0 ? `<span class="word-item-streak">🔥 ${streak}연속</span>` : ''}
          <span class="word-item-due" style="color: ${isDue ? 'var(--error)' : 'var(--text-light)'}">
            ${isDue ? '복습 필요' : (due ? `${due} 복습` : '')}
          </span>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.word-item').forEach(el => {
    const handler = () => showWordDetail(Number(el.dataset.id));
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
  });
}

// ===== WRONG NOTES SCREEN =====
function renderWrongNotes() {
  const container = document.getElementById('wrong-items');
  if (!container) return;

  // Words with wrongCount > 0, sorted by wrongCount desc
  const wrongWords = vocab
    .filter(w => (progress[w.id]?.wrongCount || 0) > 0)
    .sort((a, b) => (progress[b.id]?.wrongCount || 0) - (progress[a.id]?.wrongCount || 0));

  const countEl = document.getElementById('wrong-count');
  if (countEl) countEl.textContent = `틀린 적 있는 단어 ${wrongWords.length}개`;

  const retryBtn = document.getElementById('btn-retry-wrong-all');
  if (retryBtn) {
    retryBtn.style.display = wrongWords.length > 0 ? 'block' : 'none';
    retryBtn.onclick = () => {
      buildSession(); // ensure session exists
      session.inRetry = false; // override normal session
      showScreen('study');
      startRetryMode(wrongWords.map(w => w.id));
    };
  }

  if (wrongWords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <p>오답 노트가 비어있어요!\n틀린 단어가 없어요. 대단해요!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = wrongWords.map(w => {
    const wc = progress[w.id]?.wrongCount || 0;
    return `
      <div class="wrong-item" data-id="${w.id}" role="button" tabindex="0" style="cursor:pointer">
        <div class="wrong-item-badge">${wc}</div>
        <div class="word-item-left">
          <div class="word-item-en">${escHtml(w.word)}</div>
          <div class="word-item-ko">${escHtml(w.meaningKo)}</div>
        </div>
        <span style="color: var(--text-light); font-size: 13px;">오답 ${wc}회</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.wrong-item').forEach(el => {
    const handler = () => showWordDetail(Number(el.dataset.id));
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
  });
}

// ===== STATS SCREEN =====
function renderStats() {
  const learnedCount = vocab.filter(w => progress[w.id]?.learned).length;
  const totalCount   = vocab.length;

  let totalCorrect = 0, totalAttempts = 0;
  Object.values(progress).forEach(p => {
    totalCorrect  += p.totalCorrect  || 0;
    totalAttempts += p.totalAttempts || 0;
  });
  const accuracy = totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts * 100) : 0;

  const dueToday = vocab.filter(w => SRS.isDue(progress[w.id])).length;

  // streak
  computeStreak();

  const els = {
    'stat-learned':   learnedCount,
    'stat-total':     totalCount,
    'stat-streak':    streakInfo.count,
    'stat-due':       dueToday,
    'stat-accuracy':  accuracy + '%',
    'stat-attempts':  totalAttempts
  };

  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const accFill = document.getElementById('accuracy-bar-fill');
  if (accFill) accFill.style.width = accuracy + '%';

  const progFill = document.getElementById('stats-progress-fill');
  if (progFill) progFill.style.width = `${totalCount ? Math.round(learnedCount / totalCount * 100) : 0}%`;

  const progText = document.getElementById('stats-progress-text');
  if (progText) progText.textContent = `${learnedCount} / ${totalCount}`;
}

// ===== WORD DETAIL MODAL =====
function showWordDetail(wordId) {
  const word = vocab.find(w => w.id === wordId);
  if (!word) return;
  const prog = progress[wordId] || SRS.getInitial();

  const posKo    = POS_KO[word.partOfSpeech] || word.partOfSpeech;
  const posBadge = POS_BADGE[word.partOfSpeech] || '';

  const examplesHTML = (word.examples || []).map(ex => `
    <div class="example-item">
      <div class="ex-en">"${ex.en}"</div>
      <div class="ex-ko">${ex.ko}</div>
    </div>
  `).join('');

  const modal = document.getElementById('word-modal');
  const sheet = document.getElementById('modal-sheet');
  if (!modal || !sheet) return;

  sheet.innerHTML = `
    <div class="modal-handle"></div>
    <button class="modal-close-btn" id="modal-close-btn" aria-label="닫기">✕</button>
    <div class="modal-word-en">
      ${escHtml(word.word)}
      <button class="btn-tts" style="margin-left:8px; vertical-align: middle;" aria-label="발음 듣기">🔊</button>
    </div>
    <div class="modal-word-ko">${escHtml(word.meaningKo)}</div>
    <div class="modal-meta">
      <span class="badge ${posBadge}">${posKo}</span>
      ${prog.learnedDate ? `<span style="font-size:12px; color: var(--text-light)">학습일: ${formatDate(prog.learnedDate)}</span>` : ''}
    </div>
    <div class="modal-section-title">예문</div>
    <div class="modal-examples">${examplesHTML}</div>
    <div class="modal-stats-row">
      <div class="modal-stat">
        <div class="msn">${prog.streak || 0}</div>
        <div class="msl">연속 정답</div>
      </div>
      <div class="modal-stat">
        <div class="msn">${prog.wrongCount || 0}</div>
        <div class="msl">오답 횟수</div>
      </div>
      <div class="modal-stat">
        <div class="msn">${prog.intervalDays || 0}일</div>
        <div class="msl">복습 간격</div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  sheet.querySelector('.btn-tts')?.addEventListener('click', () => TTS.speak(word.word));
  document.getElementById('modal-close-btn')?.addEventListener('click', closeWordDetail);
  modal.addEventListener('click', e => { if (e.target === modal) closeWordDetail(); });
}

function closeWordDetail() {
  document.getElementById('word-modal')?.classList.add('hidden');
}

// ===== TOAST =====
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

// ===== HTML ESCAPING =====
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== INIT =====
async function init() {
  // Initialize TTS
  TTS.init();

  // Load vocab data
  try {
    const res = await fetch('./data/vocab-middle1.json');
    if (!res.ok) throw new Error('fetch failed');
    vocab = await res.json();
  } catch (e) {
    document.getElementById('loading-screen').innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--error)">
        <p style="font-size:40px">⚠️</p>
        <p style="font-weight:700; margin-top:12px">단어 데이터를 불러오지 못했어요.</p>
        <p style="font-size:14px; color: var(--text-light); margin-top:8px">
          이 사이트는 GitHub Pages에서 실행해야 해요.<br>
          로컬에서 테스트하려면 VS Code Live Server를 사용하세요.
        </p>
      </div>
    `;
    return;
  }

  // Load saved state
  loadAll();

  // Hide loading, show app
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Wire bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      showScreen(target);
      if (target === 'home')      renderHome();
      if (target === 'wordlist')  renderWordList();
      if (target === 'wrong')     renderWrongNotes();
      if (target === 'stats')     renderStats();
    });
  });

  // Wire start study button
  document.getElementById('btn-start-study')?.addEventListener('click', startStudy);

  // Wire study close button
  document.getElementById('study-close-btn')?.addEventListener('click', () => {
    showScreen('home');
    renderHome();
  });

  // Wire word list search
  document.getElementById('wordlist-search')?.addEventListener('input', e => {
    renderWordList(e.target.value.trim());
  });

  // Wire retry all wrong button (set up in renderWrongNotes)

  // Show home screen
  renderHome();
  showScreen('home');
}

document.addEventListener('DOMContentLoaded', init);
