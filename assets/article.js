/* ==========================================================================
   article.js — 글 페이지 컨트롤러
   ?id=<id>로 메타를 조회하고 헤더 렌더 후 본문 조각을 fetch해 주입.
   본문 조각은 소유자가 직접 작성한 신뢰 콘텐츠이므로 innerHTML로 주입한다.
   ========================================================================== */

(function () {
  "use strict";

  var C = window.Content;
  var root = document.getElementById("article-root");
  var crumb = document.getElementById("crumb");
  var id = new URLSearchParams(location.search).get("id");

  function notFound() {
    document.title = "찾을 수 없음 — WoonKyong";
    C.renderState(
      root,
      "글을 찾을 수 없습니다",
      "주소가 올바르지 않거나 삭제된 글입니다.",
      { href: "index.html", label: "홈으로" }
    );
  }

  function renderHeader(manifest, article) {
    var cat = C.getCategory(manifest, article.category);
    var header = C.el("header", { class: "article-header" });

    if (cat) {
      header.appendChild(
        C.el("a", {
          class: "cat-pill",
          href: "category.html?cat=" + encodeURIComponent(cat.id)
        }, cat.label)
      );
    }
    header.appendChild(C.el("h1", {}, article.title));

    var metaParts = [C.formatDate(article.date)];
    var metaEl = C.el("div", { class: "meta" }, metaParts.join(" · "));
    header.appendChild(metaEl);

    if (article.tags && article.tags.length) {
      var tags = C.el("div", { class: "tags", style: "margin-top:12px" });
      article.tags.forEach(function (t) {
        tags.appendChild(C.el("span", { class: "tag-chip" }, t));
      });
      header.appendChild(tags);
    }
    return header;
  }

  C.loadManifest()
    .then(function (manifest) {
      var article = id ? C.getArticle(manifest, id) : null;
      if (!article) {
        notFound();
        return;
      }

      document.title = article.title + " — WoonKyong";
      var cat = C.getCategory(manifest, article.category);
      crumb.textContent = "› " + (cat ? cat.label : article.category);

      if (cat) {
        var accentCss = "";
        if (cat.accent) accentCss += "--accent:" + cat.accent + ";";
        if (cat.accent2) accentCss += "--accent2:" + cat.accent2 + ";";
        if (accentCss) root.setAttribute("style", accentCss);
      }

      root.innerHTML = "";
      root.appendChild(renderHeader(manifest, article));

      var body = C.el("div", { class: "article-body" });
      root.appendChild(body);

      return C.loadArticleHtml(article.path)
        .then(function (html) {
          // 소유자 작성 신뢰 콘텐츠 → innerHTML 주입
          body.innerHTML = html;
        })
        .catch(function (err) {
          C.renderError(body, err.message);
        });
    })
    .catch(function (err) {
      C.renderError(root, err.message);
    });
})();
