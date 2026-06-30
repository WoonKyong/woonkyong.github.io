/* ==========================================================================
   content.js — 데이터 계층 (전 페이지 공유)
   매니페스트(content/index.json) 로드 + fetch 헬퍼 + 작은 DOM 유틸.
   JSON 구조와 fetch를 아는 유일한 모듈. 페이지 컨트롤러는 DOM만 다룬다.
   전역 객체 `Content`로 노출한다.
   ========================================================================== */

(function () {
  "use strict";

  var MANIFEST_URL = "content/index.json";
  var _manifestPromise = null;

  /* ---------- 매니페스트 로드 (1회 fetch 후 캐시) ---------- */
  function loadManifest() {
    if (_manifestPromise) return _manifestPromise;
    _manifestPromise = fetch(MANIFEST_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("매니페스트 로드 실패 (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        // 방어적 기본값
        data.categories = data.categories || [];
        data.articles = data.articles || [];
        data.links = data.links || [];
        return data;
      })
      .catch(function (err) {
        // 다음 호출에서 재시도할 수 있도록 캐시 비우기
        _manifestPromise = null;
        throw err;
      });
    return _manifestPromise;
  }

  /* ---------- 카테고리 ---------- */
  function getCategories(manifest) {
    return manifest.categories.slice();
  }

  function getCategory(manifest, id) {
    return manifest.categories.filter(function (c) {
      return c.id === id;
    })[0] || null;
  }

  /* ---------- 글 ---------- */
  function _sortByDateDesc(arr) {
    return arr.slice().sort(function (a, b) {
      // date는 YYYY-MM-DD 문자열 → 사전식 비교로 정렬 가능
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
  }

  function getArticles(manifest, opts) {
    opts = opts || {};
    var list = manifest.articles;
    if (opts.category) {
      list = list.filter(function (a) {
        return a.category === opts.category;
      });
    }
    return _sortByDateDesc(list);
  }

  function getArticle(manifest, id) {
    return manifest.articles.filter(function (a) {
      return a.id === id;
    })[0] || null;
  }

  function getRecentArticles(manifest, n) {
    return getArticles(manifest).slice(0, n || 6);
  }

  /* ---------- 링크 ---------- */
  function getLinks(manifest, category) {
    return manifest.links.filter(function (l) {
      return l.category === category;
    });
  }

  /* ---------- 글 본문 조각 로드 ---------- */
  function loadArticleHtml(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) throw new Error("글 본문 로드 실패 (" + res.status + ")");
      return res.text();
    });
  }

  /* ---------- 헬퍼 ---------- */
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    // "2026-06-20" → "2026년 6월 20일"
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return iso;
    return y + "년 " + m + "월 " + d + "일";
  }

  // 작은 DOM 빌더: el("a", {href, class}, [children|string])
  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        if (key === "class") node.className = props[key];
        else if (key === "html") node.innerHTML = props[key];
        else if (key === "text") node.textContent = props[key];
        else if (props[key] != null) node.setAttribute(key, props[key]);
      });
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(
          typeof c === "string" ? document.createTextNode(c) : c
        );
      });
    }
    return node;
  }

  // 컨테이너에 가시적 에러 메시지 렌더 (빈 화면 방지)
  function renderError(container, message) {
    container.innerHTML = "";
    container.appendChild(
      el("div", { class: "error-msg" }, "⚠️ " + (message || "콘텐츠를 불러오지 못했습니다."))
    );
  }

  // 컨테이너에 빈/안내 상태 렌더
  function renderState(container, title, body, link) {
    container.innerHTML = "";
    var box = el("div", { class: "state-msg" });
    if (title) box.appendChild(el("div", { class: "state-title" }, title));
    if (body) box.appendChild(el("div", {}, body));
    if (link) {
      box.appendChild(el("a", { class: "btn-primary", href: link.href }, link.label));
    }
    container.appendChild(box);
  }

  window.Content = {
    loadManifest: loadManifest,
    getCategories: getCategories,
    getCategory: getCategory,
    getArticles: getArticles,
    getArticle: getArticle,
    getRecentArticles: getRecentArticles,
    getLinks: getLinks,
    loadArticleHtml: loadArticleHtml,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    el: el,
    renderError: renderError,
    renderState: renderState
  };
})();
