(function () {
  "use strict";

  var notes = {
    a: "전날 비, 높은 습도, 약한 바람. 운해는 기대하되 보장하지 않는다.",
    b: "일출이 흐려도 노고단의 고도와 능선을 즐긴다. 무리하지 않고 하산한다.",
    c: "강풍·폭우·통제가 있으면 산행을 포기한다. 늦잠, 화엄사, 섬진강으로 전환.",
    d: "9/16 새벽이 더 좋다면 예약 가능 여부와 귀가 시간을 확인한 뒤 교체한다."
  };

  var plans = document.querySelectorAll(".plan");
  var note = document.getElementById("plan-note");
  plans.forEach(function (plan) {
    plan.addEventListener("click", function () {
      plans.forEach(function (item) { item.classList.remove("active"); });
      plan.classList.add("active");
      note.textContent = notes[plan.getAttribute("data-plan")];
    });
  });

  var checks = document.querySelectorAll(".pack-grid input");
  var count = document.getElementById("pack-count");
  var bar = document.getElementById("pack-bar");
  var storageKey = "gurye-trip-packing";
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (error) { saved = []; }

  checks.forEach(function (check, index) {
    check.checked = saved[index] === true;
    check.addEventListener("change", updatePacking);
  });

  function updatePacking() {
    var completed = 0;
    var state = [];
    checks.forEach(function (check) {
      state.push(check.checked);
      if (check.checked) completed += 1;
    });
    count.textContent = completed + " / " + checks.length;
    bar.style.width = (completed / checks.length * 100) + "%";
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* storage unavailable */ }
  }

  updatePacking();
})();
