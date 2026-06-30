/* ==========================================================================
   category.js — 카테고리 페이지 컨트롤러
   ?cat=<id> 파라미터를 검증하고 글 목록 + 자료 모음을 렌더.
   ========================================================================== */

(function () {
  "use strict";

  var C = window.Content;
  var root = document.getElementById("category-root");
  var crumbSep = document.getElementById("crumb-sep");
  var catId = new URLSearchParams(location.search).get("cat");

  function renderHeader(cat) {
    return C.el("header", { class: "page-header" }, [
      C.el("div", { class: "emoji" }, cat.emoji || "📁"),
      C.el("h1", {}, cat.label),
      C.el("div", { class: "desc" }, cat.description || "")
    ]);
  }

  function renderArticles(manifest, cat) {
    var section = C.el("section", { class: "section" });
    section.appendChild(C.el("h2", { class: "section-head" }, "글"));

    var articles = C.getArticles(manifest, { category: cat.id });
    if (articles.length === 0) {
      section.appendChild(C.el("div", { class: "state-msg" }, "아직 글이 없습니다."));
      return section;
    }

    var list = C.el("div", { class: "article-list" });
    articles.forEach(function (a) {
      var meta = C.el("div", { class: "meta" }, [
        C.el("span", {}, C.formatDate(a.date))
      ]);
      if (a.tags && a.tags.length) {
        var tags = C.el("span", { class: "tags" });
        a.tags.forEach(function (t) {
          tags.appendChild(C.el("span", { class: "tag-chip" }, t));
        });
        meta.appendChild(tags);
      }
      list.appendChild(
        C.el(
          "a",
          { class: "article-card", href: "article.html?id=" + encodeURIComponent(a.id) },
          [
            meta,
            C.el("div", { class: "title" }, a.title),
            C.el("div", { class: "summary" }, a.summary || "")
          ]
        )
      );
    });
    section.appendChild(list);
    return section;
  }

  function renderLinks(manifest, cat) {
    var links = C.getLinks(manifest, cat.id);
    if (links.length === 0) return null;

    var section = C.el("section", { class: "section" });
    section.appendChild(C.el("h2", { class: "section-head" }, "자료 모음"));
    var list = C.el("div", { class: "link-list" });
    links.forEach(function (l) {
      list.appendChild(
        C.el("a", { class: "link-item", href: l.url, target: "_blank", rel: "noopener" }, [
          C.el("div", { class: "link-title" }, l.title),
          l.note ? C.el("div", { class: "link-note" }, l.note) : null
        ])
      );
    });
    section.appendChild(list);
    return section;
  }

  C.loadManifest()
    .then(function (manifest) {
      var cat = catId ? C.getCategory(manifest, catId) : null;
      if (!cat) {
        document.title = "찾을 수 없음 — WoonKyong";
        C.renderState(
          root,
          "분야를 찾을 수 없습니다",
          "주소가 올바르지 않거나 삭제된 분야입니다.",
          { href: "index.html", label: "홈으로" }
        );
        return;
      }

      document.title = cat.label + " — WoonKyong";
      crumbSep.textContent = "› " + cat.label;

      // 분야 accent 색상을 하위 요소에 상속
      var accentCss = "";
      if (cat.accent) accentCss += "--accent:" + cat.accent + ";";
      if (cat.accent2) accentCss += "--accent2:" + cat.accent2 + ";";
      if (accentCss) root.setAttribute("style", accentCss);

      root.innerHTML = "";
      root.appendChild(renderHeader(cat));
      root.appendChild(renderArticles(manifest, cat));
      var linksSection = renderLinks(manifest, cat);
      if (linksSection) root.appendChild(linksSection);
    })
    .catch(function (err) {
      C.renderError(root, err.message);
    });
})();
