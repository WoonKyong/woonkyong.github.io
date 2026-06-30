/* ==========================================================================
   home.js — 홈페이지 컨트롤러
   카테고리 카드 그리드 + 최근 글 피드 렌더.
   ========================================================================== */

(function () {
  "use strict";

  var C = window.Content;
  var gridEl = document.getElementById("category-grid");
  var recentEl = document.getElementById("recent-list");

  function articleCount(manifest, catId) {
    return C.getArticles(manifest, { category: catId }).length;
  }

  function accentStyle(cat, extra) {
    var s = "";
    if (cat.accent) s += "--accent:" + cat.accent + ";";
    if (cat.accent2) s += "--accent2:" + cat.accent2 + ";";
    return s + (extra || "");
  }

  function renderCategories(manifest) {
    gridEl.innerHTML = "";
    C.getCategories(manifest).forEach(function (cat, i) {
      var n = articleCount(manifest, cat.id);
      var card = C.el(
        "a",
        {
          class: "category-card",
          href: "category.html?cat=" + encodeURIComponent(cat.id),
          style: accentStyle(cat, "--i:" + i + ";")
        },
        [
          C.el("div", { class: "emoji" }, cat.emoji || "📁"),
          C.el("div", { class: "label" }, cat.label),
          C.el("div", { class: "desc" }, cat.description || ""),
          C.el("div", { class: "count" }, n > 0 ? n + "개의 글" : "준비 중")
        ]
      );
      gridEl.appendChild(card);
    });
  }

  function renderRecent(manifest) {
    recentEl.innerHTML = "";
    var recent = C.getRecentArticles(manifest, 6);
    if (recent.length === 0) {
      recentEl.appendChild(C.el("div", { class: "state-msg" }, "아직 글이 없습니다."));
      return;
    }
    recent.forEach(function (a) {
      var cat = C.getCategory(manifest, a.category);
      var meta = C.el("div", { class: "meta" }, [
        C.el("span", { class: "cat-pill" }, cat ? cat.label : a.category),
        C.el("span", {}, C.formatDate(a.date))
      ]);
      var card = C.el(
        "a",
        {
          class: "article-card",
          href: "article.html?id=" + encodeURIComponent(a.id),
          style: cat ? accentStyle(cat) : null
        },
        [
          meta,
          C.el("div", { class: "title" }, a.title),
          C.el("div", { class: "summary" }, a.summary || "")
        ]
      );
      recentEl.appendChild(card);
    });
  }

  C.loadManifest()
    .then(function (manifest) {
      renderCategories(manifest);
      renderRecent(manifest);
    })
    .catch(function (err) {
      C.renderError(gridEl, err.message);
    });
})();
