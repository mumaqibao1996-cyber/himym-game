// ==========================================
//  HIMYM Game — Main Engine
//  Visual Novel Engine · 纯 JS
// ==========================================

(function() {
  'use strict';

  // ==================
  // STATE
  // ==================
  const State = {
    // 当前场景
    currentSeasonId: 1,
    currentEpisodeId: null,
    currentSceneId: null,
    sceneQueue: [],        // 当前 episode 的场景序列
    sceneIndex: 0,

    // 好感度
    affinity: {},

    // 解锁状态
    unlockedSeasons: [1],
    episodeProgress: {},   // { 's1e01': 'complete', ... }

    // 好感度变化追踪（本集）
    episodeAffinityDelta: {},

    // 成就
    achievements: [],

    // UI 状态
    isTyping: false,
    isShowingChoices: false,
    autoPlay: false,
    autoTimer: null,
    affinityPanelOpen: false,

    // 已触发的成就
    triggeredAchievements: new Set(),

    // 自动进入下一集的倒计时句柄
    _autoNextTimer: null,
  };

  // ==================
  // INIT AFFINITY
  // ==================
  function initAffinity() {
    Object.keys(CHARACTERS).forEach(id => {
      if (CHARACTERS[id].initialAffinity !== undefined) {
        State.affinity[id] = CHARACTERS[id].initialAffinity;
      }
    });
  }

  // ==================
  // DOM REFS
  // ==================
  const $ = id => document.getElementById(id);
  const screens = {
    main:       $('screen-main'),
    seasons:    $('screen-seasons'),
    characters: $('screen-characters'),
    game:       $('screen-game'),
    episodeEnd: $('screen-episode-end'),
  };

  // ==================
  // SCREEN TRANSITIONS
  // ==================
  function showScreen(name, instant) {
    if (instant) {
      Object.values(screens).forEach(s => s.classList.remove('active'));
      screens[name].classList.add('active');
      return;
    }
    // 淡出当前，淡入目标
    const current = Object.values(screens).find(s => s.classList.contains('active'));
    if (current === screens[name]) return;
    if (current) {
      current.style.opacity = '0';
      current.style.pointerEvents = 'none';
      setTimeout(() => {
        current.classList.remove('active');
        current.style.opacity = '';
        current.style.pointerEvents = '';
      }, 450);
    }
    setTimeout(() => {
      screens[name].classList.add('active');
    }, 100);
  }

  // ==================
  // FILM FLASH TRANSITION
  // ==================
  let flashEl = null;
  function filmFlash(cb) {
    if (!flashEl) {
      flashEl = document.createElement('div');
      flashEl.className = 'scene-transition';
      document.body.appendChild(flashEl);
    }
    flashEl.classList.add('flash');
    setTimeout(() => {
      if (cb) cb();
      flashEl.classList.remove('flash');
    }, 350);
  }

  // ==================
  // TYPEWRITER EFFECT
  // ==================
  let typeTimer = null;
  function typeText(el, text, speed, onDone) {
    if (typeTimer) clearTimeout(typeTimer);
    State.isTyping = true;
    el.innerHTML = '';
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    function step() {
      if (i < text.length) {
        el.textContent = text.slice(0, i + 1);
        el.appendChild(cursor);
        i++;
        typeTimer = setTimeout(step, speed || 28);
      } else {
        State.isTyping = false;
        cursor.remove();
        if (onDone) onDone();
      }
    }
    step();
  }

  function skipTyping(el, text) {
    if (typeTimer) clearTimeout(typeTimer);
    State.isTyping = false;
    el.textContent = text;
    const c = el.querySelector('.cursor');
    if (c) c.remove();
  }

  // ==================
  // AFFINITY CHANGE
  // ==================
  function applyEffect(effect) {
    if (!effect) return;
    const popup = $('affinity-popup');
    let labels = [];
    Object.entries(effect).forEach(([charId, delta]) => {
      if (delta === 0) return;
      const old = State.affinity[charId] || 0;
      State.affinity[charId] = Math.max(0, Math.min(100, old + delta));
      // Track episode delta
      State.episodeAffinityDelta[charId] = (State.episodeAffinityDelta[charId] || 0) + delta;
      const char = CHARACTERS[charId];
      if (char) {
        labels.push(`${char.shortName} ${delta > 0 ? '+' : ''}${delta}`);
      }
    });
    if (labels.length > 0) {
      popup.textContent = labels.join(' · ');
      popup.classList.remove('show');
      void popup.offsetWidth; // reflow
      popup.classList.add('show');
      setTimeout(() => popup.classList.remove('show'), 1900);
    }
    updateAffinityBars();
  }

  // ==================
  // AFFINITY BARS
  // ==================
  function buildAffinityBars() {
    const container = $('affinity-bars');
    container.innerHTML = '';
    MAIN_AFFINITY_CHARS.forEach(id => {
      const char = CHARACTERS[id];
      if (!char) return;
      const val = State.affinity[id] || 0;
      const color = AFFINITY_COLORS[id] || 'var(--gold)';
      const row = document.createElement('div');
      row.className = 'affinity-bar-row';
      row.id = `abar-${id}`;
      row.innerHTML = `
        <div class="affinity-bar-header">
          <span class="affinity-char-name">${char.shortName}</span>
          <span class="affinity-val" id="aval-${id}">${val}</span>
        </div>
        <div class="affinity-bar-track">
          <div class="affinity-bar-fill" id="afill-${id}" style="width:${val}%;background:${color}"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  function updateAffinityBars() {
    MAIN_AFFINITY_CHARS.forEach(id => {
      const val = State.affinity[id] || 0;
      const fillEl = $(`afill-${id}`);
      const valEl  = $(`aval-${id}`);
      if (fillEl) fillEl.style.width = val + '%';
      if (valEl)  valEl.textContent = val;
    });
  }

  // ==================
  // BUILD CHARACTERS PAGE
  // ==================
  function buildCharactersPage() {
    const container = $('characters-list');
    container.innerHTML = '';
    ALL_CHARS_ORDER.forEach(id => {
      const char = CHARACTERS[id];
      if (!char || char.isPlayer) return;
      const val = State.affinity[id] !== undefined ? State.affinity[id] : (char.locked ? 0 : 0);
      const color = AFFINITY_COLORS[id] || 'var(--gold)';
      const card = document.createElement('div');
      card.className = 'character-card';
      card.style.borderLeftColor = color;
      const locked = char.locked && val === 0;
      const hasPhoto = !locked && char.avatar;
      const avatarStyle = hasPhoto
        ? `background:${color}22;background-image:url('${char.avatar}')`
        : `background:${color}22`;
      const avatarClass = hasPhoto ? 'char-avatar has-photo' : 'char-avatar';
      card.innerHTML = `
        <div class="${avatarClass}" style="${avatarStyle}">${locked ? '❓' : (hasPhoto ? '' : char.emoji)}</div>
        <div class="char-info">
          <div class="char-name">${locked ? '???' : char.name}</div>
          <div class="char-role">${locked ? '尚未解锁' : char.role}</div>
          ${!locked ? `
          <div class="char-affinity-wrap">
            <div class="char-affinity-bar">
              <div class="char-affinity-fill" style="width:${val}%;background:${color}"></div>
            </div>
            <div class="char-affinity-num">${val}</div>
          </div>
          ` : ''}
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ==================
  // BUILD SEASONS PAGE
  // ==================
  function buildSeasonsPage() {
    const grid = $('seasons-grid');
    grid.innerHTML = '';
    SEASONS_META.forEach(season => {
      const card = document.createElement('div');
      const unlocked = State.unlockedSeasons.includes(season.id);
      const hasData = !!season.data;
      // unlocked + 有数据 = 可玩；unlocked + 无数据 = 即将推出；locked = 锁定
      let cardState = 'locked';
      if (unlocked && hasData) cardState = 'unlocked';
      else if (unlocked && !hasData) cardState = 'coming-soon';
      card.className = `season-card ${cardState}`;
      // Progress
      let progress = 0;
      if (season.data && unlocked) {
        const eps = season.data.episodes || [];
        const done = eps.filter(e => State.episodeProgress[e.id] === 'complete').length;
        progress = eps.length > 0 ? Math.round((done / eps.length) * 100) : 0;
      }
      card.innerHTML = `
        <div class="season-num">${String(season.id).padStart(2,'0')}</div>
        <div class="season-label">${season.label}</div>
        <div class="season-title">${season.title}</div>
        <div class="season-progress">
          <div class="season-progress-bar" style="width:${unlocked ? progress : 0}%"></div>
        </div>
        ${!unlocked ? '<div class="season-lock-icon">🔒</div>' : ''}
        ${unlocked && !hasData ? '<div class="season-lock-icon">✦</div>' : ''}
      `;
      if (unlocked) {
        card.addEventListener('click', () => startSeason(season.id));
      }
      grid.appendChild(card);
    });
  }

  // ==================
  // START SEASON / EPISODE
  // ==================
  function startSeason(seasonId) {
    const seasonMeta = SEASONS_META.find(s => s.id === seasonId);
    if (!seasonMeta) return;
    if (!seasonMeta.data) {
      // 显示"即将推出"提示
      showComingSoon(seasonMeta);
      return;
    }
    const season = seasonMeta.data;
    // Find first incomplete episode
    const ep = season.episodes.find(e => State.episodeProgress[e.id] !== 'complete') || season.episodes[0];
    startEpisode(season, ep);
  }

  function showComingSoon(seasonMeta) {
    // 用模态弹窗方式提示，不切换屏幕避免黑屏
    const existing = document.getElementById('coming-soon-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'coming-soon-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:500;
      background:rgba(0,0,0,0.85);
      display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(6px);
      animation:fadeIn 0.3s ease;
    `;
    modal.innerHTML = `
      <div style="
        background:linear-gradient(135deg,#1a100a,#2a1a10);
        border:1.5px solid rgba(244,200,96,0.3);
        border-radius:20px;
        padding:36px 28px;
        width:min(320px,85vw);
        text-align:center;
        box-shadow:0 20px 60px rgba(0,0,0,0.8);
      ">
        <div style="font-family:'Special Elite',monospace;font-size:11px;letter-spacing:3px;color:rgba(244,200,96,0.6);text-transform:uppercase;margin-bottom:12px">${seasonMeta.year}</div>
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;color:#fdf6e3;margin-bottom:6px">${seasonMeta.label}</div>
        <div style="font-family:'Lora',serif;font-style:italic;font-size:15px;color:rgba(244,200,96,0.8);margin-bottom:20px">${seasonMeta.title}</div>
        <div style="font-family:'Lora',serif;font-size:14px;color:rgba(253,246,227,0.6);line-height:1.6;margin-bottom:28px">
          这一季的故事正在赶来的路上……<br>敬请期待。
        </div>
        <button id="cs-close-btn" style="
          background:linear-gradient(135deg,#d4a030,#f4c860);
          border:none;border-radius:12px;
          padding:13px 32px;
          font-family:'Playfair Display',serif;font-size:15px;font-weight:700;
          color:#0d0805;cursor:pointer;
          box-shadow:0 4px 16px rgba(244,200,96,0.4);
          width:100%;
        ">← 返回章节选择</button>
      </div>
    `;

    document.body.appendChild(modal);

    // 点击背景或按钮关闭
    const close = () => {
      modal.style.transition = 'opacity 0.25s ease';
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 260);
    };
    document.getElementById('cs-close-btn').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  function startEpisode(season, episode) {
    State.currentSeasonId = season.id;
    State.currentEpisodeId = episode.id;
    State.sceneQueue = episode.scenes || [];
    State.sceneIndex = 0;
    State.episodeAffinityDelta = {};
    State.isShowingChoices = false;

    // Update episode info label
    const epNum = season.episodes.indexOf(episode) + 1;
    $('episode-info').textContent = `Season ${season.id} · Episode ${epNum}`;

    // Show game screen
    showScreen('game');
    buildAffinityBars();

    // Reset affinity panel
    State.affinityPanelOpen = false;
    $('affinity-panel').classList.remove('open');

    // Start first scene
    setTimeout(() => renderScene(), 300);
  }

  // ==================
  // RENDER SCENE
  // ==================
  function renderScene() {
    const scene = State.sceneQueue[State.sceneIndex];
    if (!scene) return;

    const dialogueBox = $('dialogue-box');
    const choicesArea = $('choices-area');

    // Hide choices
    choicesArea.style.display = 'none';
    State.isShowingChoices = false;
    dialogueBox.style.display = 'flex';

    // BG
    const sceneBg = $('scene-bg');
    const bgClass = scene.bg || 'bg-mclarens';
    sceneBg.className = `scene-bg ${bgClass}`;

    // Character sprite
    const spriteEl = $('character-sprite');
    const nameTag = $('character-name-tag');

    // 获取当前角色数据（从全局 CHARACTERS 对象）
    const charId = scene.character;
    const charData = (charId && typeof CHARACTERS !== 'undefined') ? CHARACTERS[charId] : null;
    const hasAvatar = !!(charData && charData.avatar);
    const avatarUrl = hasAvatar ? charData.avatar : null;

    const applySprite = (isNarration) => {
      if (isNarration) {
        // 旁白用 Ted 图片
        const tedAvatar = CHARACTERS.ted && CHARACTERS.ted.avatar;
        if (tedAvatar) {
          spriteEl.className = 'character-sprite photo-mode';
          spriteEl.style.backgroundImage = `url('${tedAvatar}')`;
          spriteEl.textContent = '';
        } else {
          spriteEl.className = 'character-sprite';
          spriteEl.style.backgroundImage = '';
          spriteEl.textContent = '🧔';
        }
        nameTag.classList.remove('visible');
      } else {
        if (hasAvatar) {
          spriteEl.className = 'character-sprite photo-mode entering';
          spriteEl.style.backgroundImage = `url('${avatarUrl}')`;
          spriteEl.textContent = '';
        } else {
          spriteEl.className = 'character-sprite entering';
          spriteEl.style.backgroundImage = '';
          spriteEl.textContent = scene.emoji || charData?.emoji || '👤';
        }
        nameTag.textContent = scene.speaker || '';
        nameTag.classList.add('visible');
      }
    };

    applySprite(!!scene.isNarration);

    // Speaker
    const speakerEl = $('dialogue-speaker');
    speakerEl.textContent = scene.speaker || '';
    if (scene.isNarration) {
      speakerEl.style.fontStyle = 'italic';
      speakerEl.style.color = 'var(--cream-dim)';
    } else {
      speakerEl.style.fontStyle = '';
      speakerEl.style.color = 'var(--gold)';
    }

    // Dialogue
    const textEl = $('dialogue-text');
    const advanceEl = $('dialogue-advance');
    advanceEl.classList.add('hidden');

    typeText(textEl, scene.dialogue, 25, () => {
      advanceEl.classList.remove('hidden');
      // Achievement trigger
      if (scene.achievement) {
        triggerAchievement(scene.achievement);
      }
      // Auto play
      if (State.autoPlay && !scene.choices) {
        State.autoTimer = setTimeout(() => advanceScene(), 2000);
      }
    });
  }

  // ==================
  // ADVANCE SCENE
  // ==================
  function advanceScene() {
    if (State.autoTimer) { clearTimeout(State.autoTimer); State.autoTimer = null; }

    const scene = State.sceneQueue[State.sceneIndex];
    if (!scene) return;

    // If typing, skip to end
    if (State.isTyping) {
      skipTyping($('dialogue-text'), scene.dialogue);
      $('dialogue-advance').classList.remove('hidden');
      if (scene.achievement) triggerAchievement(scene.achievement);
      return;
    }

    // If episode end
    if (scene.isEpisodeEnd) {
      showEpisodeEnd(scene);
      return;
    }

    // If has choices, show them
    if (scene.choices && scene.choices.length > 0) {
      showChoices(scene.choices);
      return;
    }

    // Advance to next scene
    const nextId = scene.next;
    if (nextId) {
      const nextIdx = State.sceneQueue.findIndex(s => s.id === nextId);
      if (nextIdx !== -1) {
        State.sceneIndex = nextIdx;
      } else {
        State.sceneIndex++;
      }
    } else {
      State.sceneIndex++;
    }

    if (State.sceneIndex >= State.sceneQueue.length) {
      // End of episode scenes
      const lastScene = State.sceneQueue[State.sceneQueue.length - 1];
      showEpisodeEnd(lastScene);
      return;
    }

    filmFlash(() => renderScene());
  }

  // ==================
  // SHOW CHOICES
  // ==================
  function showChoices(choices) {
    State.isShowingChoices = true;
    const dialogueBox = $('dialogue-box');
    const choicesArea = $('choices-area');
    const choicesList = $('choices-list');

    dialogueBox.style.display = 'none';
    choicesArea.style.display = 'flex';
    choicesList.innerHTML = '';

    choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      let effectHtml = '';
      if (choice.effectLabel && choice.effectLabel.length > 0) {
        effectHtml = `<div class="choice-effect">${
          choice.effectLabel.map(e => `<span class="effect-tag ${e.cls}">${e.text}</span>`).join('')
        }</div>`;
      }
      btn.innerHTML = `<div class="choice-text">${choice.text}</div>${effectHtml}`;
      btn.addEventListener('click', () => selectChoice(choice));
      // Stagger animation
      btn.style.opacity = '0';
      btn.style.transform = 'translateX(-10px)';
      setTimeout(() => {
        btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        btn.style.opacity = '1';
        btn.style.transform = 'translateX(0)';
      }, idx * 80);
      choicesList.appendChild(btn);
    });
  }

  // ==================
  // SELECT CHOICE
  // ==================
  function selectChoice(choice) {
    // Apply effect
    applyEffect(choice.effect);

    // Achievement in choice
    if (choice.achievement) triggerAchievement(choice.achievement);

    // Find next scene
    const nextId = choice.next;
    if (nextId) {
      const nextIdx = State.sceneQueue.findIndex(s => s.id === nextId);
      if (nextIdx !== -1) {
        State.sceneIndex = nextIdx;
        filmFlash(() => renderScene());
        return;
      }
    }

    // Default: advance
    State.sceneIndex++;
    filmFlash(() => renderScene());
  }

  // ==================
  // EPISODE END
  // ==================
  function showEpisodeEnd(scene) {
    const season = SEASONS_META.find(s => s.id === State.currentSeasonId);
    const episodeData = season?.data?.episodes?.find(e => e.id === State.currentEpisodeId);

    // Mark episode complete
    State.episodeProgress[State.currentEpisodeId] = 'complete';

    // Build affinity changes summary
    const affinityEl = $('episode-affinity-changes');
    affinityEl.innerHTML = '';
    Object.entries(State.episodeAffinityDelta).forEach(([id, delta]) => {
      if (delta === 0) return;
      const char = CHARACTERS[id];
      if (!char) return;
      const item = document.createElement('div');
      item.className = `affinity-change-item ${delta > 0 ? 'up' : 'down'}`;
      item.textContent = `${char.shortName} ${delta > 0 ? '+' : ''}${delta}`;
      affinityEl.appendChild(item);
    });

    $('episode-end-title').textContent = episodeData?.title || 'Episode Complete';
    $('episode-end-subtitle').textContent = episodeData?.subtitle || '';
    $('episode-end-summary').textContent = scene?.endSummary || episodeData?.summary || '';

    // Check if next episode exists
    const eps = season?.data?.episodes || [];
    const currentIdx = eps.findIndex(e => e.id === State.currentEpisodeId);
    const nextEp = eps[currentIdx + 1];

    const btnNext = $('btn-next-episode');
    const btnToMain2 = $('btn-to-main2');

    // 清除之前可能残留的倒计时
    if (State._autoNextTimer) { clearInterval(State._autoNextTimer); State._autoNextTimer = null; }

    if (nextEp) {
      btnNext.style.display = 'flex';

      // 自动进入下一集：3 秒倒计时
      let countdown = 3;
      const updateBtn = () => {
        btnNext.textContent = `下一集: ${nextEp.title}  (${countdown}s) →`;
      };
      updateBtn();

      const goNext = () => {
        if (State._autoNextTimer) { clearInterval(State._autoNextTimer); State._autoNextTimer = null; }
        showScreen('game');
        startEpisode(season.data, nextEp);
      };

      State._autoNextTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          goNext();
        } else {
          updateBtn();
        }
      }, 1000);

      // 点击立即跳转（并取消倒计时）
      btnNext.onclick = goNext;

      // 「章节选择」按钮
      btnToMain2.textContent = '☰ 选择章节';
      btnToMain2.onclick = () => {
        if (State._autoNextTimer) { clearInterval(State._autoNextTimer); State._autoNextTimer = null; }
        buildSeasonsPage();
        showScreen('seasons');
      };

    } else {
      // 本季最后一集结束 — 倒计时后跳章节界面
      btnNext.style.display = 'flex';

      // Unlock next season
      const nextSeasonId = State.currentSeasonId + 1;
      if (!State.unlockedSeasons.includes(nextSeasonId)) {
        State.unlockedSeasons.push(nextSeasonId);
        SEASONS_META.forEach(s => { if (s.id === nextSeasonId) s.unlocked = true; });
      }

      let countdown = 5;
      const updateBtn = () => {
        const nextSeason = SEASONS_META.find(s => s.id === nextSeasonId);
        const label = nextSeason ? `前往 ${nextSeason.label}` : '选择章节';
        btnNext.textContent = `${label}  (${countdown}s) →`;
      };
      updateBtn();

      const goSeasons = () => {
        if (State._autoNextTimer) { clearInterval(State._autoNextTimer); State._autoNextTimer = null; }
        buildSeasonsPage();
        showScreen('seasons');
      };

      State._autoNextTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          goSeasons();
        } else {
          updateBtn();
        }
      }, 1000);

      btnNext.onclick = goSeasons;

      btnToMain2.textContent = '🏠 返回主菜单';
      btnToMain2.onclick = () => {
        if (State._autoNextTimer) { clearInterval(State._autoNextTimer); State._autoNextTimer = null; }
        showScreen('main');
      };
    }

    saveGame();
    showScreen('episode-end');
  }

  // ==================
  // ACHIEVEMENT
  // ==================
  function triggerAchievement(ach) {
    if (!ach || State.triggeredAchievements.has(ach.id)) return;
    State.triggeredAchievements.add(ach.id);
    State.achievements.push(ach.id);

    const popup = $('achievement-popup');
    $('achievement-icon').textContent = ach.icon || '🏆';
    $('achievement-name').textContent = ach.name || 'Achievement';
    popup.style.display = 'block';
    popup.style.animation = 'none';
    void popup.offsetWidth;
    popup.style.animation = '';

    setTimeout(() => {
      popup.style.transition = 'opacity 0.5s ease';
      popup.style.opacity = '0';
      setTimeout(() => {
        popup.style.display = 'none';
        popup.style.opacity = '1';
        popup.style.transition = '';
      }, 500);
    }, 3000);
  }

  // ==================
  // SAVE / LOAD
  // ==================
  function saveGame() {
    const data = {
      affinity: State.affinity,
      unlockedSeasons: State.unlockedSeasons,
      episodeProgress: State.episodeProgress,
      achievements: State.achievements,
      currentSeasonId: State.currentSeasonId,
      currentEpisodeId: State.currentEpisodeId,
    };
    try {
      localStorage.setItem('himym_save', JSON.stringify(data));
      showSaveNotice('💾 进度已保存');
    } catch(e) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem('himym_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      Object.assign(State.affinity, data.affinity || {});
      State.unlockedSeasons = data.unlockedSeasons || [1];
      State.episodeProgress = data.episodeProgress || {};
      State.achievements = data.achievements || [];
      State.achievements.forEach(id => State.triggeredAchievements.add(id));
      // Sync unlocked to meta
      SEASONS_META.forEach(s => {
        s.unlocked = State.unlockedSeasons.includes(s.id);
      });
      return true;
    } catch(e) { return false; }
  }

  function showSaveNotice(msg) {
    const existing = document.querySelector('.save-notice');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'save-notice';
    el.textContent = msg;
    el.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(10,6,3,0.95);border:1px solid rgba(244,200,96,0.3);
      color:var(--gold);font-family:var(--font-mono);font-size:12px;
      letter-spacing:1px;padding:8px 18px;border-radius:20px;z-index:999;
      animation:popup-float 2s ease forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2100);
  }

  // ==================
  // MENU CONTROLS
  // ==================
  function openMenu() {
    $('menu-overlay').style.display = 'flex';
  }
  function closeMenu() {
    $('menu-overlay').style.display = 'none';
  }

  // ==================
  // EVENT LISTENERS
  // ==================
  function bindEvents() {
    // Main Screen
    $('btn-new-game').addEventListener('click', () => {
      initAffinity();
      State.episodeProgress = {};
      State.achievements = [];
      State.triggeredAchievements = new Set();
      State.unlockedSeasons = [1];
      SEASONS_META.forEach(s => { s.unlocked = s.id === 1; });
      startSeason(1);
    });

    $('btn-continue').addEventListener('click', () => {
      const season = SEASONS_META.find(s => s.id === State.currentSeasonId);
      const ep = season?.data?.episodes?.find(e => e.id === State.currentEpisodeId);
      if (season && ep) {
        startEpisode(season.data, ep);
      } else {
        startSeason(State.currentSeasonId);
      }
    });

    $('btn-seasons').addEventListener('click', () => {
      buildSeasonsPage();
      showScreen('seasons');
    });

    $('btn-characters').addEventListener('click', () => {
      buildCharactersPage();
      showScreen('characters');
    });

    // Seasons Screen
    $('btn-back-main').addEventListener('click', () => showScreen('main'));

    // Characters Screen
    $('btn-back-main2').addEventListener('click', () => showScreen('main'));

    // Game Screen - Dialogue click to advance
    $('dialogue-box').addEventListener('click', advanceScene);

    // Game - Menu
    $('btn-menu').addEventListener('click', openMenu);
    $('btn-menu-close').addEventListener('click', closeMenu);
    $('menu-overlay').addEventListener('click', e => {
      if (e.target === $('menu-overlay')) closeMenu();
    });

    $('btn-save').addEventListener('click', () => { saveGame(); closeMenu(); });
    $('btn-load').addEventListener('click', () => { loadGame(); closeMenu(); showSaveNotice('📂 存档已读取'); });
    $('btn-auto').addEventListener('click', () => {
      State.autoPlay = !State.autoPlay;
      $('btn-auto').textContent = State.autoPlay ? '⏸ 停止自动' : '⏩ 自动播放';
      closeMenu();
    });
    $('btn-skip').addEventListener('click', () => {
      closeMenu();
      advanceScene();
    });
    $('btn-to-main').addEventListener('click', () => {
      closeMenu();
      showScreen('main');
    });

    // Affinity Panel Toggle
    $('btn-affinity-toggle').addEventListener('click', () => {
      State.affinityPanelOpen = !State.affinityPanelOpen;
      $('affinity-panel').classList.toggle('open', State.affinityPanelOpen);
    });
    $('btn-close-affinity').addEventListener('click', () => {
      State.affinityPanelOpen = false;
      $('affinity-panel').classList.remove('open');
    });

    // Episode End Screen
    // btn-to-main2 的点击行为由 showEpisodeEnd 动态赋值

    // Keyboard support (desktop)
    document.addEventListener('keydown', e => {
      if ($('screen-game').classList.contains('active')) {
        if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          if (!State.isShowingChoices) advanceScene();
        }
        if (e.key === 'Escape') openMenu();
      }
    });

    // Swipe support
    let touchStartX = 0;
    document.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (!$('screen-game').classList.contains('active')) return;
      if (State.isShowingChoices) return;
      const dx = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(dx) > 60) return; // Horizontal swipe, ignore
    }, { passive: true });
  }

  // ==================
  // BOOT
  // ==================
  function boot() {
    // 动态绑定各季数据（各 season*.js 在本脚本之前加载完毕）
    const seasonDataMap = {
      1: typeof SEASON1 !== 'undefined' ? SEASON1 : null,
      2: typeof SEASON2 !== 'undefined' ? SEASON2 : null,
      3: typeof SEASON3 !== 'undefined' ? SEASON3 : null,
      4: typeof SEASON4 !== 'undefined' ? SEASON4 : null,
      5: typeof SEASON5 !== 'undefined' ? SEASON5 : null,
      6: typeof SEASON6 !== 'undefined' ? SEASON6 : null,
      7: typeof SEASON7 !== 'undefined' ? SEASON7 : null,
      8: typeof SEASON8 !== 'undefined' ? SEASON8 : null,
      9: typeof SEASON9 !== 'undefined' ? SEASON9 : null,
    };
    SEASONS_META.forEach(s => {
      if (seasonDataMap[s.id] !== undefined) s.data = seasonDataMap[s.id];
    });

    initAffinity();

    // Try load save
    const hasSave = loadGame();

    // Show continue button if save exists
    if (hasSave && State.currentEpisodeId) {
      $('btn-continue').style.display = 'flex';
    }

    bindEvents();
    buildAffinityBars();

    // Show main screen
    showScreen('main', true);

    // Subtle entrance animation on logo
    setTimeout(() => {
      const logo = document.querySelector('.main-logo');
      if (logo) {
        logo.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
        logo.style.opacity = '0';
        logo.style.transform = 'translateY(10px)';
        void logo.offsetWidth;
        logo.style.opacity = '1';
        logo.style.transform = 'translateY(0)';
      }
    }, 100);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
