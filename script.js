// アプリ全体で使う変数の準備
let userAnswers = [];
let subjectResults = {};
let radarChart = null;
let examPlans = {}; // ★新規追加：受験プランを保存する変数

// --- 新規追加：科目とデータに応じた問題番号（ア・イ・ウ…など）を生成する関数 ---
function getQuestionLabels(subject, data) {
    let labels = [];
    if (subject === "math1A" || subject === "math2BC" || subject === "jouhou1") {
        const kana = ["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ", "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト", "ナ", "ニ", "ヌ", "ネ", "ノ", "ハ", "ヒ", "フ", "ヘ", "ホ", "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ", "ロ", "ワ"];
        if (data.sections) {
            for (let sIdx = 0; sIdx < data.sections.length; sIdx++) {
                let cCount = 0;
                for (let i = 0; i < data.sections[sIdx].count; i++) {
                    labels.push(kana[cCount % kana.length]);
                    cCount++;
                }
            }
        }
    } else {
        for (let i = 0; i < data.answers.length; i++) labels.push((i + 1).toString());
    }
    return labels;
}

function updateSheet() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;
    let data = pastTests[subject][year];

    let container = document.getElementById("sheet-container");
    container.innerHTML = "";
    userAnswers = [];

    // 連続入力欄の文字をリセット
    let fastInputElem = document.getElementById("fast-answer-input");
    if (fastInputElem) {
        fastInputElem.value = "";
    }

    let markSheetBlock = document.createElement("div");
    markSheetBlock.className = "mark-sheet-block";

    let labels = getQuestionLabels(subject, data);
    let currentQ = 0;

    // 選ばれた大問だけを画面に作る
    for (let sIdx = 0; sIdx < data.sections.length; sIdx++) {
        let sec = data.sections[sIdx];
        let isSelected = window.selectedSections.includes(sIdx);

        if (isSelected) {
            // 大問の見出しを追加
            let secHeader = document.createElement("div");
            secHeader.style.padding = "10px"; secHeader.style.background = "#f1f5f9"; secHeader.style.color = "#334155";
            secHeader.style.fontWeight = "bold"; secHeader.style.margin = "20px 0 10px"; secHeader.style.borderRadius = "6px";
            secHeader.textContent = sec.name;
            markSheetBlock.appendChild(secHeader);
        }

        for (let i = 0; i < sec.count; i++) {
            if (isSelected) {
                let row = document.createElement("div");
                row.className = "mark-row";
                row.dataset.q = currentQ; // 絶対インデックスを記憶

                let qNum = document.createElement("div");
                qNum.className = "q-num";
                qNum.textContent = labels[currentQ];
                row.appendChild(qNum);

                let bubbles = document.createElement("div");
                bubbles.className = "bubbles";

                // 科目に応じて丸の種類と横幅（列数）を変更する
                let choices = [];
                if (subject === "jouhou1") {
                    choices = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
                } else if (subject === "math1A" || subject === "math2BC") {
                    choices = ['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                    bubbles.style.gridTemplateColumns = "repeat(11, max-content)";
                } else {
                    choices = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                }

                choices.forEach(c => {
                    let bubble = document.createElement("div");
                    bubble.className = "choice bubble";
                    bubble.textContent = c;
                    bubbles.appendChild(bubble);
                });

                row.appendChild(bubbles);
                markSheetBlock.appendChild(row);
            }
            currentQ++;
        }
    }
    container.appendChild(markSheetBlock);
}

// クリックして色を塗る処理
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("choice")) {
        let row = e.target.closest(".mark-row");
        let q = row.dataset.q;

        row.querySelectorAll(".choice").forEach(c => {
            c.classList.remove("selected");
        });

        e.target.classList.add("selected");
        userAnswers[q] = e.target.textContent;

        if (typeof updateFastInputDisplay === 'function') {
            updateFastInputDisplay();
        }
    }
});

// --- 採点機能（完答・順不同対応版・エラー防止強化） ---
function gradeTest() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;
    let data = pastTests[subject][year];
    let score = 0;

    let details = [];
    let sectionResults = [];
    let currentQ = 0;
    let sections = data.sections || [{ name: "全問", count: data.answers.length }];
    let labels = getQuestionLabels(subject, data);

    let tempDetails = [];
    for (let i = 0; i < data.answers.length; i++) {
        let ans = String(data.answers[i]);
        let userAns = userAnswers[i] !== undefined ? String(userAnswers[i]) : "";
        let isCorrect = (userAns === ans);
        let point = (data.exceptions && data.exceptions[i] !== undefined) ? data.exceptions[i] : data.defaultPoint;
        tempDetails.push({ qNum: labels[i], isCorrect: isCorrect, point: point, originalPoint: point, groupPassed: true });
    }

    if (data.kantouGroups) {
        data.kantouGroups.forEach(group => {
            let allCorrect = group.every(idx => tempDetails[idx].isCorrect);
            if (allCorrect) {
                let totalPoint = tempDetails[group[0]].originalPoint;
                group.forEach((idx, i) => { tempDetails[idx].point = (i === 0) ? totalPoint : 0; tempDetails[idx].groupPassed = true; });
            } else {
                group.forEach(idx => { tempDetails[idx].point = 0; tempDetails[idx].groupPassed = false; });
            }
        });
    }

    if (data.unorderedGroups) {
        data.unorderedGroups.forEach(group => {
            let correctAnswers = group.map(idx => String(data.answers[idx])).sort();
            let uAnswers = group.map(idx => userAnswers[idx] !== undefined ? String(userAnswers[idx]) : "").sort();
            let isMatch = JSON.stringify(correctAnswers) === JSON.stringify(uAnswers);
            if (isMatch) {
                let totalPoint = tempDetails[group[0]].originalPoint;
                group.forEach((idx, i) => { tempDetails[idx].isCorrect = true; tempDetails[idx].point = (i === 0) ? totalPoint : 0; tempDetails[idx].groupPassed = true; });
            } else {
                group.forEach(idx => { tempDetails[idx].isCorrect = correctAnswers.includes(userAnswers[idx]); tempDetails[idx].point = 0; tempDetails[idx].groupPassed = false; });
            }
        });
    }

    sections.forEach((sec, sIdx) => {
        let isSelected = window.selectedSections ? window.selectedSections.includes(sIdx) : true;
        let secData = { name: sec.name, score: 0, maxScore: 0, correctCount: 0, totalCount: sec.count };

        for (let i = 0; i < sec.count; i++) {
            if (currentQ >= data.answers.length) break;
            let d = tempDetails[currentQ];
            if (isSelected) {
                if (d.groupPassed && d.isCorrect) { secData.score += d.point; secData.correctCount++; score += d.point; }
                if (d.originalPoint > 0) { secData.maxScore += d.originalPoint; }
                details.push(d);
            }
            currentQ++;
        }
        if (isSelected) sectionResults.push(secData);
    });

    let hensachi = ((score - data.avg) / data.sd) * 10 + 50;
    if (!subjectResults[year]) subjectResults[year] = {};

    subjectResults[year][subject] = { score: score, avg: data.avg, sd: data.sd, hensachi: hensachi, sectionResults: sectionResults, details: details };
    localStorage.setItem("subjectResults", JSON.stringify(subjectResults));

    // ★ エラーが起きても絶対に処理が止まらないように保護
    try {
        if (typeof loadResultYears === 'function') loadResultYears();
        let ry = document.getElementById("result-year");
        if (ry) ry.value = year;
        if (typeof playSound === 'function') playSound('grade');
        if (typeof updateReport === 'function') updateReport();
        if (typeof updateChart === 'function') updateChart();
        if (typeof updateJudge === 'function') updateJudge();
        if (typeof updateTopHensachi === 'function') updateTopHensachi();
    } catch (e) { console.error("画面更新エラー:", e); }

    try {
        if (typeof timerInterval !== 'undefined') clearInterval(timerInterval);
        if (typeof backToSetup === 'function') backToSetup(true);
    } catch (e) { console.error("設定リセットエラー:", e); }

    // ★ 確実に成績確認タブへ移動！
    switchTab('tab-results');
}

// ==========================================
// ★新規追加：受験プラン作成・連動機能群
// ==========================================

function loadPlanYears() {
    let years = new Set();
    for (let sub in pastTests) {
        Object.keys(pastTests[sub]).forEach(y => years.add(y));
    }
    let yearSelect = document.getElementById("plan-year");
    if (!yearSelect) return;
    yearSelect.innerHTML = "";
    Array.from(years).sort().forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}年度</option>`;
    });
    updatePlanUI();
}

function updatePlanUI() {
    let type = document.getElementById("plan-type").value;
    let area = document.getElementById("plan-subjects-area");

    let required = [
        { id: "japanese", name: "国語 (200点)" },
        { id: "englishR", name: "英語R (100点)" },
        { id: "englishL", name: "英語L (100点)" },
        { id: "math1A", name: "数学ⅠA (100点)" },
        { id: "math2BC", name: "数学ⅡBC (100点)" },
        { id: "jouhou1", name: "情報Ⅰ (100点)" }
    ];

    let social = [
        { id: "rekishiNihon", name: "日本史探究" }, { id: "rekishiSekai", name: "世界史探究" },
        { id: "chiriSougou", name: "地理総合探究" }, { id: "koukyouRinri", name: "公共・倫理" }, { id: "koukyouKeizai", name: "公共・政経" }
    ];

    let scienceKiso = [
        { id: "butsuriKiso", name: "物理基礎" }, { id: "kagakuKiso", name: "化学基礎" }, { id: "seibutsuKiso", name: "生物基礎" }
    ];

    let science = [
        { id: "butsuri", name: "物理" }, { id: "kagaku", name: "化学" }, { id: "seibutsu", name: "生物" }, { id: "chigaku", name: "地学" }
    ];

    let html = `<div style="margin-bottom:15px;"><strong style="color:var(--primary-dark);">■ 必須科目 (計700点)</strong><br><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">`;
    required.forEach(s => {
        html += `<label style="font-size:14px; color:#64748b;"><input type="checkbox" class="plan-req" value="${s.id}" checked disabled> ${s.name}</label>`;
    });
    html += `</div></div>`;

    if (type === "bunkei") {
        html += `<div style="margin-bottom:15px;"><strong style="color:var(--primary-dark);">■ 地歴公民 (2科目選択 / 計200点)</strong><br><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">`;
        social.forEach(s => html += `<label style="font-size:14px; cursor:pointer;"><input type="checkbox" class="plan-soc" value="${s.id}"> ${s.name}</label>`);
        html += `</div></div>`;

        html += `<div><strong style="color:var(--primary-dark);">■ 理科基礎 (2科目選択 / 計100点)</strong><br><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">`;
        scienceKiso.forEach(s => html += `<label style="font-size:14px; cursor:pointer;"><input type="checkbox" class="plan-sci" value="${s.id}"> ${s.name}</label>`);
        html += `</div></div>`;
    } else {
        html += `<div style="margin-bottom:15px;"><strong style="color:var(--primary-dark);">■ 地歴公民 (1科目選択 / 計100点)</strong><br><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">`;
        social.forEach(s => html += `<label style="font-size:14px; cursor:pointer;"><input type="checkbox" class="plan-soc" value="${s.id}"> ${s.name}</label>`);
        html += `</div></div>`;

        html += `<div><strong style="color:var(--primary-dark);">■ 理科専門 (2科目選択 / 計200点)</strong><br>
        <span style="font-size:11px; color:#ef4444;">※現在過去問データがあるのは物理のみですが、目標管理のために選択できます。</span>
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:5px;">`;
        science.forEach(s => html += `<label style="font-size:14px; cursor:pointer;"><input type="checkbox" class="plan-sci" value="${s.id}"> ${s.name}</label>`);
        html += `</div></div>`;
    }

    area.innerHTML = html;
}

// ★変更：途中で「待った（ポップアップの返事待ち）」をかけるため、async を追加
async function savePlan() {
    let year = document.getElementById("plan-year").value;
    let type = document.getElementById("plan-type").value;

    let subjects = [];
    document.querySelectorAll(".plan-req:checked").forEach(e => subjects.push(e.value));

    let socCount = document.querySelectorAll(".plan-soc:checked").length;
    let sciCount = document.querySelectorAll(".plan-sci:checked").length;

    if (type === "bunkei") {
        if (socCount !== 2) { alert("文系は地歴公民を2科目選択してください。"); return; }
        if (sciCount !== 2) { alert("文系は理科基礎を2科目選択してください。"); return; }
    } else {
        if (socCount !== 1) { alert("理系は地歴公民を1科目選択してください。"); return; }
        if (sciCount !== 2) { alert("理系は理科専門を2科目選択してください。"); return; }
    }

    // ===============================================
    // ★新規追加：すでに成績が保存されている場合の「警告とリセット処理」
    // ===============================================
    let hasResults = subjectResults[year] && Object.keys(subjectResults[year]).length > 0;

    if (hasResults) {
        let msg = `${year}年度はすでに成績が保存されています。\n\nプランを新しく作り直すと、現在保存されている ${year}年度の成績データは【すべて消去（リセット）】されてしまいます。\n\n本当に上書きしてプランを作り直しますか？`;

        // 警告ポップアップを出し、ユーザーの選択を待つ
        let isOk = await showCustomConfirm("⚠️ 警告：成績リセット", msg, "上書きする", "キャンセル");

        // 「キャンセル」が押されたらここで処理をストップ
        if (!isOk) return;

        // 「上書きする」が押されたら、その年度の成績を完全に削除する
        delete subjectResults[year];
        localStorage.setItem("subjectResults", JSON.stringify(subjectResults));
    }
    // ===============================================

    document.querySelectorAll(".plan-soc:checked").forEach(e => subjects.push(e.value));
    document.querySelectorAll(".plan-sci:checked").forEach(e => subjects.push(e.value));

    examPlans[year] = { type: type, subjects: subjects };
    localStorage.setItem("examPlans", JSON.stringify(examPlans));

    if (typeof showAchievementToast === 'function') {
        showAchievementToast("プラン作成", `${year}年度の受験プランを作成しました！`, "📝");
    } else {
        alert(`${year}年度の受験プランを作成しました！`);
    }

    loadGradingYears();
    loadResultYears();
    document.getElementById("result-year").value = year;
    updateReport();
    if (typeof updateChart === 'function') updateChart();
}

function loadGradingYears() {
    let yearSelect = document.getElementById("year");
    if (!yearSelect) return;
    let currentVal = yearSelect.value;
    yearSelect.innerHTML = "";

    let years = new Set();
    for (let sub in pastTests) Object.keys(pastTests[sub]).forEach(y => years.add(y));

    Array.from(years).sort().forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}年度</option>`;
    });

    if (Array.from(years).includes(currentVal)) yearSelect.value = currentVal;
    updateGradingSubjects();
}

function updateGradingSubjects() {
    let year = document.getElementById("year").value;
    let warning = document.getElementById("grading-warning");
    let subjSelect = document.getElementById("subject");
    let startBtn = document.getElementById("btn-start-exam");
    let optArea = document.getElementById("optional-sections-area");

    // プランがない年度を選んだら警告を出してブロック
    if (!examPlans[year]) {
        warning.style.display = "block";
        subjSelect.innerHTML = `<option value="">科目が選択できません</option>`;
        subjSelect.disabled = true;
        if (startBtn) startBtn.disabled = true;
        if (optArea) optArea.style.display = "none";
        return;
    }

    warning.style.display = "none";
    subjSelect.disabled = false;
    if (startBtn) startBtn.disabled = false;

    subjSelect.innerHTML = "";
    examPlans[year].subjects.forEach(sub => {
        // 過去問データが存在する科目のみ表示
        if (pastTests[sub] && pastTests[sub][year]) {
            subjSelect.innerHTML += `<option value="${sub}">${subjectNames[sub]}</option>`;
        }
    });

    if (subjSelect.options.length === 0) {
        subjSelect.innerHTML = `<option value="">選択できる過去問がありません</option>`;
        subjSelect.disabled = true;
        if (startBtn) startBtn.disabled = true;
    }
    updateOptionalUI();
}

function updateOptionalUI() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;
    if (!subject || !year || !pastTests[subject] || !pastTests[subject][year]) return;

    let data = pastTests[subject][year];
    let optArea = document.getElementById("optional-sections-area");
    let checkboxesDiv = document.getElementById("optional-checkboxes");

    if (data.optionalChoices) {
        optArea.style.display = "block";
        checkboxesDiv.innerHTML = "";
        let start = data.optionalChoices.startSection;
        for (let i = start; i < data.sections.length; i++) {
            let sec = data.sections[i];
            let label = document.createElement("label");
            label.style.display = "flex"; label.style.alignItems = "center"; label.style.gap = "5px"; label.style.cursor = "pointer";
            let cb = document.createElement("input");
            cb.type = "checkbox"; cb.className = "optional-cb"; cb.value = i;
            if (i < start + data.optionalChoices.choose) cb.checked = true;
            label.appendChild(cb); label.appendChild(document.createTextNode(sec.name));
            checkboxesDiv.appendChild(label);
        }
    } else {
        optArea.style.display = "none";
    }
}

// --- 成績表の更新（1000点満点対応） ---
function updateReport() {
    let resultYear = document.getElementById("result-year") ? document.getElementById("result-year").value : null;
    let displayArea = document.getElementById("results-display-area");

    if (!resultYear || !examPlans[resultYear]) {
        if (displayArea) displayArea.style.display = "none";
        return;
    }

    if (displayArea) displayArea.style.display = "block";

    let currentResults = subjectResults[resultYear] || {};
    let plan = examPlans[resultYear];
    let body = document.getElementById("reportBody");
    body.innerHTML = "";
    let totalScore = 0;

    // 1000点満点の枠組みに従って表を描画
    plan.subjects.forEach(subject => {
        let r = currentResults[subject];
        let max = subjectMax[subject];

        if (r) {
            totalScore += r.score;
            let row = `<tr>
                <td>${subjectNames[subject]}</td>
                <td><strong style="color:var(--accent); font-size:16px;">${r.score}</strong> / ${max}</td>
                <td>${r.avg}</td><td>${r.sd}</td><td>${r.hensachi.toFixed(1)}</td>
            </tr>`;
            body.innerHTML += row;
        } else {
            let row = `<tr style="opacity: 0.6; background:#f8fafc;">
                <td>${subjectNames[subject]}</td>
                <td>未受験 / ${max}</td>
                <td>-</td><td>-</td><td>-</td>
            </tr>`;
            body.innerHTML += row;
        }
    });

    document.getElementById("totalScore").innerHTML = `<span style="font-size:24px; color:var(--accent);">${totalScore}</span>`;

    let detailArea = document.getElementById("detailed-results-area");
    if (!detailArea) return;
    detailArea.innerHTML = "<h3 style='border-bottom: 2px solid var(--border); padding-bottom: 10px;'>大問別・設問別 詳細レポート</h3>";

    let hasDetails = false;
    plan.subjects.forEach(subject => {
        let r = currentResults[subject];
        if (!r || !r.sectionResults || !r.details) return;
        hasDetails = true;

        let html = `<div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: var(--shadow);">`;
        html += `<h4 style="margin-top: 0; color: var(--primary-dark);">${subjectNames[subject]}</h4>`;
        if (r.isDirectInput) {
            html += `<p style="color: var(--text-muted); font-size: 14px;">※手動で入力されたため、詳細データはありません。</p></div>`;
            detailArea.innerHTML += html;
            return;
        }

        html += `<div class="detail-table-wrapper">`;
        html += `<table class="scoreTable" style="margin-bottom: 25px; box-shadow: none;"><thead><tr><th>大問</th><th>得点 / 満点</th><th>正答率</th></tr></thead><tbody>`;
        r.sectionResults.forEach(sec => {
            let rate = sec.totalCount > 0 ? Math.round((sec.correctCount / sec.totalCount) * 100) : 0;
            html += `<tr><td style="font-weight: bold;">${sec.name}</td><td><strong style="color: var(--accent); font-size: 16px;">${sec.score}</strong> / ${sec.maxScore}</td><td>${rate}%</td></tr>`;
        });
        html += `</tbody></table></div>`;

        html += `<h5 style="margin-bottom: 10px; color: var(--text-muted);">設問ごとの判定</h5><div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
        r.details.forEach(d => {
            let mark = ""; let color = ""; let bg = "";
            if (d.groupPassed && d.isCorrect) { mark = "〇"; color = "#16a34a"; bg = "#f0fdf4"; }
            else if (!d.groupPassed && d.isCorrect) { mark = "△"; color = "#eab308"; bg = "#fefce8"; }
            else { mark = "×"; color = "#ef4444"; bg = "#fef2f2"; }

            let displayQNum = isNaN(d.qNum) ? d.qNum : `問${d.qNum}`;
            html += `<div style="border: 1px solid var(--border); border-radius: 6px; padding: 8px 5px; width: 45px; text-align: center; background: ${bg};"><div style="font-size: 11px; color: var(--text-muted);">${displayQNum}</div><div style="margin: 2px 0;"><span style="color: ${color}; font-size: 20px; font-weight: bold;">${mark}</span></div><div style="font-size: 11px; font-weight: bold; color: ${color};">${d.point}点</div></div>`;
        });
        html += `</div>`;

        let weakPoints = [];
        r.sectionResults.forEach(sec => {
            let rate = sec.totalCount > 0 ? (sec.correctCount / sec.totalCount) : 0;
            if (rate < 0.6) weakPoints.push(sec.name);
        });

        if (weakPoints.length > 0) {
            html += `<div style="margin-top: 20px; padding: 15px; background: #fffbeb; border-left: 5px solid #f59e0b; border-radius: 4px;">
                        <h5 style="margin: 0 0 5px 0; color: #b45309; font-size: 15px;">💡 AI弱点分析</h5>
                        <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">今回は <strong>${weakPoints.join('、')}</strong> の正答率が低めでした。復習しましょう！</p></div>`;
        } else {
            html += `<div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 5px solid #22c55e; border-radius: 4px;">
                        <h5 style="margin: 0 0 5px 0; color: #166534; font-size: 15px;">🌟 完璧です！</h5>
                        <p style="margin: 0; font-size: 13px; color: #14532d; line-height: 1.5;">弱点が見当たりません！この調子をキープしましょう！</p></div>`;
        }

        let memoValue = r.memo || "";
        html += `<div style="margin-top: 25px; border-top: 2px dashed var(--border); padding-top: 18px; width: 100%; clear: both;">
                    <label style="display: block; font-size: 14px; font-weight: bold; margin-bottom: 8px;">📝 自己分析メモ</label>
                    <textarea oninput="saveSubjectMemo('${resultYear}', '${subject}', this.value)" 
                        style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 14px; min-height: 90px; background: #f8fafc;">${memoValue}</textarea>
                 </div></div>`;
        detailArea.innerHTML += html;
    });

    if (!hasDetails) detailArea.innerHTML += "<p style='color: var(--text-muted);'>表示できる詳細データがありません。</p>";
}

function updateChart() {
    let resultYear = document.getElementById("result-year") ? document.getElementById("result-year").value : null;
    let currentResults = (resultYear && subjectResults[resultYear]) ? subjectResults[resultYear] : {};
    let plan = examPlans[resultYear];

    let uniKey = document.getElementById("university") ? document.getElementById("university").value : "nagoya";
    let uniBorder = universities[uniKey] ? universities[uniKey].border : 65;

    let labels = [];
    let myData = [];
    let targetData = [];
    let avgData = [];

    if (plan) {
        plan.subjects.forEach(key => {
            if (currentResults[key]) {
                labels.push(subjectNames[key]);
                let myPercent = currentResults[key].score / subjectMax[key] * 100;
                myData.push(myPercent);

                let avgPercent = currentResults[key].avg / subjectMax[key] * 100;
                avgData.push(avgPercent);

                let targetScore = currentResults[key].avg + (uniBorder - 50) * currentResults[key].sd / 10;
                let targetPercent = targetScore / subjectMax[key] * 100;
                if (targetPercent > 100) targetPercent = 100;
                targetData.push(targetPercent);
            }
        });
    }

    if (labels.length === 0) {
        labels = ["未受験"]; myData = [0]; targetData = [0]; avgData = [0];
    }

    if (radarChart) radarChart.destroy();
    radarChart = new Chart(document.getElementById("radarChart"), {
        type: "radar",
        data: {
            labels: labels,
            datasets: [
                { label: "あなたの得点率", data: myData, backgroundColor: 'rgba(59, 130, 246, 0.4)', borderColor: 'rgba(59, 130, 246, 1)', pointBackgroundColor: 'rgba(59, 130, 246, 1)', order: 3 },
                { label: "志望校目標", data: targetData, backgroundColor: 'transparent', borderColor: 'rgba(16, 185, 129, 1)', borderDash: [5, 5], borderWidth: 2, order: 1 },
                { label: "全国平均", data: avgData, backgroundColor: 'transparent', borderColor: 'rgba(100, 116, 139, 1)', borderWidth: 2, order: 2 }
            ]
        },
        options: { scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } } }
    });
}

// ==========================================
// ★アプリ起動時の処理
// ==========================================
window.onload = function () {
    updateCountdown();

    let savedPlans = localStorage.getItem("examPlans");
    if (savedPlans) examPlans = JSON.parse(savedPlans);

    let saved = localStorage.getItem("subjectResults");
    if (saved) {
        subjectResults = JSON.parse(saved);
        if (subjectResults.japanese || subjectResults.englishR || subjectResults.math1A) {
            let oldData = subjectResults;
            subjectResults = { "2022": oldData };
            localStorage.setItem("subjectResults", JSON.stringify(subjectResults));
        }
    }

    loadPlanYears();
    loadGradingYears();
    loadResultYears();

    if (document.getElementById("result-year") && document.getElementById("result-year").value) {
        updateReport();
        updateChart();
        updateJudge();
    }

    applyProfile();
    loadFriends();
    updateTopHensachi();
}

document.getElementById("subject").addEventListener("change", () => {

    loadYears();

});


function loadYears() {
    let subject = document.getElementById("subject").value;
    let yearSelect = document.getElementById("year");
    yearSelect.innerHTML = "";
    let years = Object.keys(pastTests[subject]);
    years.sort();
    years.forEach(year => {
        let option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    updateOptionalUI(); // ★追加
}

// ★新規追加：選択問題のチェックボックスを自動生成する関数
function updateOptionalUI() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;
    if (!subject || !year || !pastTests[subject] || !pastTests[subject][year]) return;

    let data = pastTests[subject][year];
    let optArea = document.getElementById("optional-sections-area");
    let checkboxesDiv = document.getElementById("optional-checkboxes");

    if (data.optionalChoices) {
        optArea.style.display = "block";
        checkboxesDiv.innerHTML = "";
        let start = data.optionalChoices.startSection;
        for (let i = start; i < data.sections.length; i++) {
            let sec = data.sections[i];
            let label = document.createElement("label");
            label.style.display = "flex"; label.style.alignItems = "center"; label.style.gap = "5px"; label.style.cursor = "pointer";
            let cb = document.createElement("input");
            cb.type = "checkbox"; cb.className = "optional-cb"; cb.value = i;
            if (i < start + data.optionalChoices.choose) cb.checked = true; // デフォルトで必要な数だけチェック
            label.appendChild(cb); label.appendChild(document.createTextNode(sec.name));
            checkboxesDiv.appendChild(label);
        }
    } else {
        optArea.style.display = "none";
    }
}

//開発者向け
function generateDemoResult() {
    let dummyDetails = [];
    for (let i = 1; i <= 25; i++) {
        let isCorrect = (i % 5 !== 0);
        dummyDetails.push({ qNum: i, isCorrect: isCorrect, point: isCorrect ? 4 : 0 });
    }

    // ★ 複数の年度（2022年と2023年）のデモデータを作成
    subjectResults = {
        "2022": {
            japanese: { score: 142, avg: 110, sd: 20, hensachi: 66.0, details: [] },
            englishR: { score: 78, avg: 61.8, sd: 15.4, hensachi: 60.5, details: [] },
            englishL: { score: 72, avg: 57.2, sd: 14.8, hensachi: 60.0, details: [] },
            math1A: {
                score: 80, avg: 48.5, sd: 16.2, hensachi: 69.4,
                sectionResults: [
                    { name: "第1問", score: 16, maxScore: 20, correctCount: 4, totalCount: 5 },
                    { name: "第2問", score: 16, maxScore: 20, correctCount: 4, totalCount: 5 },
                    { name: "第3問", score: 16, maxScore: 20, correctCount: 4, totalCount: 5 },
                    { name: "第4問", score: 16, maxScore: 20, correctCount: 4, totalCount: 5 },
                    { name: "第5問", score: 16, maxScore: 20, correctCount: 4, totalCount: 5 }
                ],
                details: dummyDetails
            },
            math2BC: { score: 68, avg: 51.3, sd: 15.9, hensachi: 60.5, details: [] }
        },
        "2023": {
            japanese: { score: 165, avg: 110, sd: 20, hensachi: 77.5, details: [] },
            math1A: { score: 92, avg: 48.5, sd: 16.2, hensachi: 76.8, details: [] }
        }
    };

    localStorage.setItem("subjectResults", JSON.stringify(subjectResults));

    loadResultYears();
    document.getElementById("result-year").value = "2022"; // デモ生成時は2022年を選択

    updateReport();
    updateChart();
    updateJudge();
    updateTopHensachi();
}
// --- タブ切り替え機能 ---
function switchTab(tabId) {
    // 押し間違いや引数のズレを自動修正
    if (tabId === 'home') tabId = 'tab-home';

    // 1. 全てのタブセクションを非表示にする
    let sections = document.querySelectorAll('.tab-section');
    sections.forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('active');
    });

    // 2. 全てのサイドバーメニュー・ボトムナビの選択状態を解除する
    let menus = document.querySelectorAll('.nav-menu li, .nav-btn, .bottom-nav .nav-item');
    menus.forEach(menu => menu.classList.remove('active'));

    // 3. クリックされたタブセクションを表示する
    let targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
    }

    // 4. クリックされたメニューをハイライトする（PC・スマホ両対応）
    let activeMenus = document.querySelectorAll(`[onclick*="switchTab('${tabId}')"], [onclick*="switchTab('home')"]`);
    activeMenus.forEach(menu => menu.classList.add('active'));

    // 5. Chart.jsのリサイズバグ対策
    if (tabId === 'tab-results' && radarChart) {
        radarChart.resize();
    }
}

// --- クラウド（Firebase）へ成績を保存する機能（全科目一括保存・上書き対応版） ---
// --- クラウド（Firebase）へ成績を保存する機能（手動入力ブロック対応版） ---
async function saveScoreToCloud() {
    if (!window.db || !window.addDoc || !window.collection) return;

    let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    if (!profile.userid) {
        await showCustomConfirm("エラー", "ランキングに参加するには、まず「設定」タブでユーザーIDとニックネームを保存してください！", "OK", "", true);
        return;
    }

    let year = document.getElementById("result-year") ? document.getElementById("result-year").value : null;
    if (!year) {
        await showCustomConfirm("エラー", "保存する年度が選択されていません！", "OK", "", true);
        return;
    }

    let currentResults = subjectResults[year];
    if (!currentResults || Object.keys(currentResults).length === 0) {
        await showCustomConfirm("エラー", `${year}年度の成績データがまだありません！`, "OK", "", true);
        return;
    }

    // ★ ここが手動入力を弾くバリアです！
    let hasDirectInput = false;
    let directInputSubjects = [];
    for (let subject in currentResults) {
        if (currentResults[subject].isDirectInput) {
            hasDirectInput = true;
            directInputSubjects.push(subjectNames[subject] || subject);
        }
    }

    if (hasDirectInput) {
        await showCustomConfirm(
            "送信エラー",
            `手動で入力された成績（${directInputSubjects.join("、")}）が含まれているため、この年度のデータはランキングに送信できません。\nランキングに参加するには、マークシートから解答を入力してください。`,
            "閉じる", "", true
        );
        return; // ← ここで処理を強制終了するので、絶対に保存されません
    }

    const scoresRef = window.collection(window.db, "scores");

    try {
        const querySnapshot = await window.getDocs(scoresRef);
        let existingDocs = {};
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            if (data.userid === profile.userid && data.year === year) {
                existingDocs[data.subject] = doc.id;
            }
        });

        let hasExisting = false;
        for (let subject in currentResults) {
            if (existingDocs[subject]) {
                hasExisting = true;
                break;
            }
        }

        if (hasExisting) {
            let confirmUpdate = await showCustomConfirm(
                "データの上書き確認",
                `すでに ${year}年度 の成績が登録されています。\n最新の成績で上書き更新しますか？`,
                "上書きする", "やめる"
            );
            if (!confirmUpdate) return;
        }

        for (let subject in currentResults) {
            let resultData = currentResults[subject];
            let existingDocId = existingDocs[subject];

            if (existingDocId) {
                const docRef = window.doc(window.db, "scores", existingDocId);
                await window.updateDoc(docRef, {
                    nickname: profile.nickname, year: year, score: resultData.score, hensachi: resultData.hensachi,
                    prefecture: profile.prefecture || "", school: profile.school || "", grade: profile.grade || "",
                    bunri: profile.bunri || "未設定", // ★追加
                    university: profile.university || "nagoya",
                    updatedAt: new Date()
                });
            } else {
                await window.addDoc(scoresRef, {
                    userid: profile.userid, nickname: profile.nickname, subject: subject, year: year,
                    score: resultData.score, hensachi: resultData.hensachi,
                    prefecture: profile.prefecture || "", school: profile.school || "", grade: profile.grade || "",
                    bunri: profile.bunri || "未設定", // ★追加
                    university: profile.university || "nagoya",
                    createdAt: new Date()
                });
            }
        }

        await showCustomConfirm("保存完了！", `${profile.nickname}さんの ${year}年度 の成績をクラウドに保存・更新しました！`, "閉じる", "", true);
        updateJudge();
    } catch (error) {
        console.error("保存エラー: ", error);
        await showCustomConfirm("エラー", "保存に失敗しました。", "OK", "", true);
    }
}

// --- クラウドから成績を取得してランキングを表示する機能（件数変更＆王冠追加版） ---
async function loadRanking() {
    let subject = document.getElementById("ranking-subject").value;
    let scope = document.getElementById("ranking-scope").value;
    let tbody = document.getElementById("rankingBody");

    let myProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");

    if (scope === "prefecture" && !myProfile.prefecture) {
        alert("県内ランキングを見るには、プロフィールで都道府県を設定してください。");
        return;
    }
    if (scope === "school" && !myProfile.school) {
        alert("校内ランキングを見るには、プロフィールで高校名を設定してください。");
        return;
    }

    tbody.innerHTML = "<tr><td colspan='5'>データを読み込み中...</td></tr>";

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "scores"));
        let allScores = [];

        querySnapshot.forEach((doc) => {
            allScores.push(doc.data());
        });

        // 1. フィルタリング（科目と、選んだ範囲で絞り込む）
        let filteredScores = allScores.filter(data => {
            if (data.subject !== subject) return false;
            if (scope === "prefecture" && data.prefecture !== myProfile.prefecture) return false;
            if (scope === "school" && data.school !== myProfile.school) return false;
            return true;
        });

        // 2. 得点（score）が高い順に降順ソート
        filteredScores.sort((a, b) => b.score - a.score);

        // 3. ★範囲に応じて表示する件数を切り替える（スライス）
        let displayScores = [];
        if (scope === "school") {
            displayScores = filteredScores; // 校内は全員表示
        } else if (scope === "prefecture") {
            displayScores = filteredScores.slice(0, 100); // 県内は上位100位まで
        } else if (scope === "national") {
            displayScores = filteredScores.slice(0, 1000); // 全国は上位1000位まで
        }

        tbody.innerHTML = "";

        if (displayScores.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5'>該当する成績データがありません</td></tr>";
            return;
        }

        let rank = 1;
        displayScores.forEach((data) => {
            let hensachi = data.hensachi ? data.hensachi.toFixed(1) : "-";

            let rankText = "";
            if (rank === 1) { rankText = `<span class="crown gold">👑 1位</span>`; }
            else if (rank === 2) { rankText = `<span class="crown silver">👑 2位</span>`; }
            else if (rank === 3) { rankText = `<span class="crown bronze">👑 3位</span>`; }
            else { rankText = `<span>${rank}位</span>`; }

            // ★追加：文理のバッジデザイン
            let bunriBadge = "";
            if (data.bunri === "文系") {
                bunriBadge = `<span style="display:inline-block; font-size:10px; background:#ffe4e6; color:#e11d48; padding:2px 6px; border-radius:4px; margin-left:8px; vertical-align:middle; border:1px solid #fecdd3; font-weight:bold;">文系</span>`;
            } else if (data.bunri === "理系") {
                bunriBadge = `<span style="display:inline-block; font-size:10px; background:#dbeafe; color:#1e40af; padding:2px 6px; border-radius:4px; margin-left:8px; vertical-align:middle; border:1px solid #bfdbfe; font-weight:bold;">理系</span>`;
            }

            // ★変更：ニックネームの横にバッジを配置
            let row = `<tr>
                <td style="vertical-align: middle;">${rankText}</td>
                <td>
                    <strong style="font-size:15px; color:var(--text-main);">${data.nickname}</strong>${bunriBadge}
                    <br><span style="font-size: 12px; color: #64748b;">${data.school || "高校未設定"}</span>
                </td>
                <td><strong style="color: var(--accent); font-size: 16px;">${data.score}</strong></td>
                <td>${hensachi}</td>
            </tr>`;

            tbody.innerHTML += row;
            rank++;
        });

    } catch (error) {
        console.error("ランキング取得エラー: ", error);
        tbody.innerHTML = "<tr><td colspan='5'>エラーが発生しました。</td></tr>";
    }
}

// --- プロフィール機能 ---
function saveProfile() {
    let nickname = document.getElementById("profile-nickname").value;
    let university = document.getElementById("profile-university").value;
    let prefecture = document.getElementById("profile-prefecture").value;
    let school = document.getElementById("profile-school").value;
    let grade = document.getElementById("profile-grade").value;
    let bunri = document.getElementById("profile-bunri").value; // ★追加

    let isAgreed = document.getElementById("agree-terms").checked;
    if (!isAgreed) {
        showCustomConfirm("確認", "サービスを利用するには、利用規約とプライバシーポリシーへの同意（チェック）が必要です。", "OK", "", true);
        return;
    }

    if (nickname.trim() === "") {
        alert("ニックネームを入力してください。");
        return;
    }

    let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");

    profile.nickname = nickname;
    profile.university = university;
    profile.prefecture = prefecture;
    profile.school = school;
    profile.grade = grade;
    profile.bunri = bunri; // ★追加

    localStorage.setItem("userProfile", JSON.stringify(profile));
    alert("プロフィールを保存しました！");
    applyProfile();
}

function applyProfile() {
    let savedProfile = localStorage.getItem("userProfile");

    if (savedProfile) {
        let profile = JSON.parse(savedProfile);

        document.getElementById("profile-nickname").value = profile.nickname || "";
        document.getElementById("profile-university").value = profile.university || "nagoya";
        document.getElementById("profile-prefecture").value = profile.prefecture || "";
        document.getElementById("profile-school").value = profile.school || "";
        document.getElementById("profile-grade").value = profile.grade || "3";
        document.getElementById("profile-bunri").value = profile.bunri || "未設定";

        let scoreNickname = document.getElementById("nickname");
        if (scoreNickname) scoreNickname.value = profile.nickname;

        let scoreUni = document.getElementById("university");
        if (scoreUni) {
            scoreUni.value = profile.university;
            if (Object.keys(subjectResults).length > 0) updateJudge();
        }

        let displayNickname = document.getElementById("display-nickname");
        let displayUserid = document.getElementById("display-userid");
        let displayAvatar = document.getElementById("display-avatar");
        let displaySchool = document.getElementById("display-profile-school");
        let displayBunri = document.getElementById("display-profile-bunri");

        if (displayNickname) displayNickname.textContent = profile.nickname;

        if (displayUserid) displayUserid.textContent = profile.userid ? profile.userid : "未設定";
        if (displaySchool) displaySchool.textContent = profile.school ? profile.school : "未設定";

        // 文理の文字と色を画面に反映
        if (displayBunri) {
            displayBunri.textContent = profile.bunri ? profile.bunri : "未設定";
            if (profile.bunri === "文系") {
                displayBunri.style.color = "#e11d48"; // 赤系
            } else if (profile.bunri === "理系") {
                displayBunri.style.color = "#2563eb"; // 青系
            } else {
                displayBunri.style.color = "var(--text-main)";
            }
        }

        // ===============================================
        // ★新規追加：成績プランの「文理」を自動選択する
        // ===============================================
        let planTypeSelect = document.getElementById("plan-type");
        if (planTypeSelect && profile.bunri) {
            if (profile.bunri === "文系") {
                planTypeSelect.value = "bunkei";
            } else if (profile.bunri === "理系") {
                planTypeSelect.value = "rikei";
            }
            // プルダウンを変更したに合わせて、下の選択科目チェックボックスも自動更新する
            if (typeof updatePlanUI === 'function') {
                updatePlanUI();
            }
        }
        // ===============================================

        if (displayAvatar && profile.userid) {
            displayAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.userid}`;
        }
    }
    if (typeof updateLevelUI === 'function') updateLevelUI();
}

// --- フレンド機能 ---

// フレンドを検索して追加する
async function addFriend() {
    let friendId = document.getElementById("friend-id-input").value.trim();
    let myProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");

    if (!friendId) {
        alert("IDを入力してください。");
        return;
    }
    if (friendId === myProfile.userid) {
        alert("自分自身はフレンドに追加できません。");
        return;
    }

    let friends = JSON.parse(localStorage.getItem("myFriends") || "[]");
    if (friends.some(f => f.userid === friendId)) {
        alert("このユーザーはすでにフレンドに登録されています！");
        return;
    }

    try {
        // Firebaseの「scores」の中から、該当するIDのデータを探す
        const q = window.query(window.collection(window.db, "scores"), window.where("userid", "==", friendId));
        const querySnapshot = await window.getDocs(q);

        if (querySnapshot.empty) {
            alert("ユーザーが見つかりません。\n（※まだ一度も成績をクラウドに保存していないユーザーは検索できません）");
            return;
        }

        // 見つかったデータからニックネームを取得
        let friendData = querySnapshot.docs[0].data();
        let newFriend = {
            userid: friendData.userid,
            nickname: friendData.nickname
        };

        // ローカルに保存
        friends.push(newFriend);
        localStorage.setItem("myFriends", JSON.stringify(friends));

        alert(`${friendData.nickname} さんをフレンドに追加しました！`);
        document.getElementById("friend-id-input").value = "";
        loadFriends(); // 画面を更新

    } catch (error) {
        console.error("フレンド検索エラー: ", error);
        alert("検索中にエラーが発生しました。");
    }
}

// フレンド一覧を画面に表示する
function loadFriends() {
    let friends = JSON.parse(localStorage.getItem("myFriends") || "[]");
    let container = document.getElementById("friend-list-container");
    let countDisplay = document.getElementById("display-friend-count");

    if (countDisplay) {
        countDisplay.textContent = `${friends.length} 人`;
    }

    if (!container) return;

    if (friends.length === 0) {
        container.innerHTML = "<p style='color: #64748b;'>まだフレンドがいません。IDを検索して追加しましょう！</p>";
        return;
    }

    container.innerHTML = "";
    friends.forEach(f => {
        // IDを使ってDiceBearアバターも生成
        let card = `
        <div class="friend-card">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${f.userid}" alt="アバター" class="friend-avatar">
            <div class="friend-info">
                <h4>${f.nickname}</h4>
                <p>ID: ${f.userid}</p>
            </div>
            <button onclick="removeFriend('${f.userid}')" class="remove-btn">削除</button>
        </div>`;
        container.innerHTML += card;
    });
}

// フレンドを削除する
function removeFriend(userid) {
    if (!confirm("本当にフレンドから削除しますか？")) return;

    let friends = JSON.parse(localStorage.getItem("myFriends") || "[]");
    friends = friends.filter(f => f.userid !== userid);
    localStorage.setItem("myFriends", JSON.stringify(friends));

    loadFriends(); // 画面を更新
}
// --- 演習タイマーと画面切り替え機能 ---

let timerInterval = null;
let remainingSeconds = 0;

// 演習スタートボタンを押した時の処理
function startExam() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;
    let target = document.getElementById("target-score").value;
    let timeLimit = document.getElementById("time-limit").value;

    if (!target || !timeLimit) { alert("目標得点と制限時間を入力してください。"); return; }

    // ★追加：選択問題のチェック
    let data = pastTests[subject][year];
    window.selectedSections = [];
    if (data.optionalChoices) {
        let checkedBoxes = document.querySelectorAll(".optional-cb:checked");
        if (checkedBoxes.length !== data.optionalChoices.choose) {
            document.getElementById("optional-error").style.display = "block";
            return;
        }
        document.getElementById("optional-error").style.display = "none";
        for (let i = 0; i < data.optionalChoices.startSection; i++) window.selectedSections.push(i);
        checkedBoxes.forEach(cb => window.selectedSections.push(Number(cb.value)));
    } else {
        for (let i = 0; i < data.sections.length; i++) window.selectedSections.push(i);
    }

    document.getElementById("exam-setup-section").style.display = "none";
    document.getElementById("exam-sheet-section").style.display = "block";
    document.getElementById("display-exam-subject").textContent = subjectNames[subject];
    document.getElementById("display-exam-year").textContent = year + "年度";
    document.getElementById("display-target-score").textContent = target;

    updateSheet();

    remainingSeconds = timeLimit * 60;
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            alert("制限時間終了です！\n鉛筆を置いて、採点ボタンを押してください。");
        }
    }, 1000);
}

// タイマーの数字を「00:00」形式で画面に表示する
function updateTimerDisplay() {
    let m = Math.floor(remainingSeconds / 60);
    let s = remainingSeconds % 60;
    // 1桁の場合は頭に0をつける
    let timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    let timerElement = document.getElementById("display-timer");
    if (timerElement) {
        timerElement.textContent = timeString;
    }
}

// 設定画面に戻る（リセット）
async function backToSetup(skipConfirm = false) {
    if (!skipConfirm) {
        let isOk = await showCustomConfirm("確認", "入力中の解答はすべてリセットされます。\n設定画面に戻りますか？", "戻る", "キャンセル");
        if (!isOk) return;
    }

    // ★追加：タイマーを確実にストップ
    clearInterval(timerInterval);

    // ★追加：画面の表示を「設定（科目選択）画面」に戻す
    document.getElementById("exam-sheet-section").style.display = "none";
    document.getElementById("exam-setup-section").style.display = "block";

    // ★追加：入力中の解答と、連続入力欄の文字をリセット
    userAnswers = [];
    let fastInput = document.getElementById("fast-answer-input");
    if (fastInput) fastInput.value = "";
}

// --- 成績タブの年度を切り替える機能 ---
function loadResultYears() {
    let yearSelect = document.getElementById("result-year");
    if (!yearSelect) return;

    let currentVal = yearSelect.value;
    yearSelect.innerHTML = "";

    // 保存されている成績データから年度を取り出して並び替え
    let years = Object.keys(subjectResults).sort();
    if (years.length === 0) {
        yearSelect.innerHTML = "<option value=''>データなし</option>";
        return;
    }

    years.forEach(year => {
        let option = document.createElement("option");
        option.value = year;
        option.textContent = year + "年度";
        yearSelect.appendChild(option);
    });

    // 前に選択していた年度をキープするか、最新の年度を自動選択
    if (years.includes(currentVal)) {
        yearSelect.value = currentVal;
    } else {
        yearSelect.value = years[years.length - 1];
    }
}

// --- 最高偏差値を計算してプロフィールに表示する機能 ---
function updateTopHensachi() {
    let maxHensachi = 0;
    let bestSubject = "";
    let bestYear = "";

    // すべての年度と科目をループして、一番高い偏差値を探し出す
    for (let year in subjectResults) {
        for (let subject in subjectResults[year]) {
            let r = subjectResults[year][subject];
            // 偏差値データが存在し、かつこれまでの最大値より大きければ更新
            if (r && r.hensachi && r.hensachi > maxHensachi) {
                maxHensachi = r.hensachi;
                bestSubject = subjectNames[subject] || subject;
                bestYear = year;
            }
        }
    }

    let displayElem = document.getElementById("display-top-hensachi");
    if (displayElem) {
        if (maxHensachi > 0) {
            // 例：「69.4」を赤色で大きくし、下に「2022年度 数ⅠA」と小さく表示する
            displayElem.innerHTML = `<span style="color: var(--accent); font-size: 26px;">${maxHensachi.toFixed(1)}</span><br><span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${bestYear}年度 ${bestSubject}</span>`;
        } else {
            // データが一つもない場合
            displayElem.textContent = "--";
        }
    }
}
// --- 経験値（EXP）とレベルアップ機能 ---

function addExp(amount) {
    let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");

    // 経験値データがない場合は0からスタート
    if (typeof profile.exp !== 'number') {
        profile.exp = 0;
    }

    let oldLevel = calculateLevel(profile.exp);
    profile.exp += amount;
    let newLevel = calculateLevel(profile.exp);

    localStorage.setItem("userProfile", JSON.stringify(profile));

    updateLevelUI();

    // レベルアップした場合はお祝いのアラートを出す
    if (newLevel > oldLevel) {
        setTimeout(() => {
            playSound('grade');
            showAchievementToast("LEVEL UP!", `Lv.${oldLevel} から Lv.${newLevel} に上がりました！`, "✨");
        }, 500);
    }
}

function calculateLevel(totalExp) {
    // nレベルからn+1レベルに必要な経験値が 100n の場合の逆算式
    // 総経験値 = 50 * n * (n - 1)
    return Math.floor((1 + Math.sqrt(1 + 8 * (totalExp / 100))) / 2);
}

function updateLevelUI() {
    let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    let totalExp = profile.exp || 0;

    let currentLevel = calculateLevel(totalExp);

    // 現在のレベルに到達するまでに必要だった累計経験値
    let baseExpForCurrentLevel = 50 * currentLevel * (currentLevel - 1);

    // 現在のレベルの中で、どれだけ経験値を稼いだか
    let expInThisLevel = totalExp - baseExpForCurrentLevel;

    // 次のレベルに行くために必要な経験値（100 * n）
    let expNeededForNext = 100 * currentLevel;

    // ゲージのパーセンテージ
    let progressPercent = (expInThisLevel / expNeededForNext) * 100;

    let displayLevel = document.getElementById("display-level");
    let expBar = document.getElementById("display-exp-bar");
    let expText = document.getElementById("display-exp-text");

    if (displayLevel) displayLevel.textContent = currentLevel;
    if (expText) expText.textContent = `EXP: ${expInThisLevel} / ${expNeededForNext}`;
    if (expBar) expBar.style.width = `${progressPercent}%`;
}

// --- キーボード連続入力・予測変換スキップ機能 ---
let fastInputElem = document.getElementById("fast-answer-input");

if (fastInputElem) {
    fastInputElem.addEventListener("input", function (e) {
        let val = this.value.replace(/[０-９ａ-ｆＡ-Ｆ]/g, function (s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); });
        val = val.replace(/[ー－−-]/g, '-'); // ★全角マイナス等も半角ハイフンに統一
        val = val.toLowerCase();
        val = val.replace(/[^0-9a-f\-\s]/g, ''); // ★マイナス(-)も許可する

        let visibleRows = document.querySelectorAll(".mark-row");
        let dataLength = visibleRows.length;

        if (val.length > dataLength) val = val.slice(0, dataLength);
        this.value = val;

        visibleRows.forEach(row => { row.querySelectorAll(".choice").forEach(c => c.classList.remove("selected")); });

        userAnswers = [];
        for (let i = 0; i < val.length; i++) {
            let char = val[i];
            if (char === ' ') continue;

            let row = visibleRows[i];
            if (row) {
                let qIdx = row.dataset.q;
                userAnswers[qIdx] = char;

                let bubbles = row.querySelectorAll(".choice");
                bubbles.forEach(b => { if (b.textContent === char) b.classList.add("selected"); });
            }
        }
    });
}

// 逆に、マークシートを直接クリックした時に、入力欄の数字も連動させる関数
function updateFastInputDisplay() {
    let fastInput = document.getElementById("fast-answer-input");
    if (!fastInput) return;

    let str = "";
    let visibleRows = document.querySelectorAll(".mark-row");
    visibleRows.forEach(row => {
        let qIdx = row.dataset.q;
        if (userAnswers[qIdx] !== undefined) { str += userAnswers[qIdx]; }
        else { str += " "; }
    });
    fastInput.value = str.trimEnd();
}

// --- リッチUI（通知＆ポップアップ）機能 ---

// 1. 右上の実績通知（トースト）を表示する機能
function showAchievementToast(title, message, icon = "🏆") {
    let container = document.getElementById("toast-container");
    if (!container) return;

    let toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerHTML = `
        <div class="achievement-icon">${icon}</div>
        <div class="achievement-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    container.appendChild(toast);

    // 4.5秒後に上にフェードアウトして消す
    setTimeout(() => {
        toast.style.animation = "fadeOutUp 0.5s forwards";
        setTimeout(() => toast.remove(), 500);
    }, 4500);
}

// 2. 中央のカスタム確認ポップアップを表示する機能（「はい/いいえ」を待つ）
function showCustomConfirm(title, message, okText = "OK", cancelText = "キャンセル", hideCancel = false) {
    return new Promise((resolve) => {
        let overlay = document.getElementById("custom-modal-overlay");

        document.getElementById("custom-modal-title").textContent = title;
        document.getElementById("custom-modal-message").textContent = message;

        let btnOk = document.getElementById("custom-modal-ok");
        let btnCancel = document.getElementById("custom-modal-cancel");

        btnOk.textContent = okText;
        btnCancel.textContent = cancelText;
        btnCancel.style.display = hideCancel ? "none" : "block"; // キャンセルを隠して単なる通知にもできる

        overlay.style.display = "flex";

        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };

        const cleanup = () => {
            overlay.style.display = "none";
            btnOk.removeEventListener("click", handleOk);
            btnCancel.removeEventListener("click", handleCancel);
        };

        btnOk.addEventListener("click", handleOk);
        btnCancel.addEventListener("click", handleCancel);
    });
}

// --- ボトムナビゲーション連動 ＆ サウンド（効果音）機能 ---

// 下のメニューの色を変える機能
function updateBottomNav(clickedItem) {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (clickedItem) clickedItem.classList.add('active');
}

// 効果音を生成して鳴らす機能
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    // 最初のクリックで音声を許可する
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'grade') {
        // 採点時の音（ピロリン♪）
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1); // C#6
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'levelup') {
        // レベルアップの音（ファンファーレ風♪）
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.45); // C6
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 1.2);
    }
}
// --- 過去の点数を手動で直接入力する機能 ---
function loadDirectYears() {
    let subject = document.getElementById("direct-subject").value;
    let yearSelect = document.getElementById("direct-year");
    yearSelect.innerHTML = "";
    if (pastTests[subject]) {
        let years = Object.keys(pastTests[subject]).sort();
        years.forEach(year => {
            let option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }
}

function saveDirectScore() {
    let subject = document.getElementById("direct-subject").value;
    let year = document.getElementById("direct-year").value;
    let scoreInput = document.getElementById("direct-score").value;

    if (scoreInput === "") {
        showCustomConfirm("エラー", "得点を入力してください。", "OK", "", true);
        return;
    }
    let score = Number(scoreInput);
    if (score < 0 || score > subjectMax[subject]) {
        showCustomConfirm("エラー", `得点は0から${subjectMax[subject]}の間で入力してください。`, "OK", "", true);
        return;
    }

    let data = pastTests[subject][year];
    if (!data) return;

    let hensachi = ((score - data.avg) / data.sd) * 10 + 50;

    let isFirstTime = false;
    if (!subjectResults[year] || !subjectResults[year][subject]) {
        isFirstTime = true;
    }

    if (!subjectResults[year]) subjectResults[year] = {};

    subjectResults[year][subject] = {
        score: score,
        avg: data.avg,
        sd: data.sd,
        hensachi: hensachi,
        isDirectInput: true, // ★ランキング送信をブロックするためのフラグ
        sectionResults: [],
        details: []
    };

    localStorage.setItem("subjectResults", JSON.stringify(subjectResults));

    // 入力欄を閉じてリセット
    document.getElementById("direct-input-section").style.display = "none";
    document.getElementById("direct-score").value = "";

    loadResultYears();
    document.getElementById("result-year").value = year;

    playSound('grade');

    updateReport();
    updateChart();
    updateJudge();
    updateTopHensachi();

    // 直接入力では経験値は少なく(50)入るように設定
    if (isFirstTime) {
        addExp(50);
        setTimeout(() => showAchievementToast("成績登録", "過去の点数を直接登録しました！（EXP +50）", "📝"), 500);
    } else {
        setTimeout(() => showAchievementToast("成績更新", "点数を上書きしました", "📝"), 500);
    }

    switchTab('tab-results');
}

// --- 共通テスト自動カウントダウン機能 ---
function updateCountdown() {
    let now = new Date();

    // 次の共通テストの年を決定（現在が1月後半以降なら来年とみなす）
    let testYear = now.getFullYear();
    if (now.getMonth() === 0 && now.getDate() > 20) {
        testYear++; // 1月20日を過ぎたら来年にする
    } else if (now.getMonth() > 0) {
        testYear++; // 2月以降も来年
    }

    // 共通テストは毎年「1月13日以降の最初の土曜日」
    let testDate = new Date(testYear, 0, 13);
    while (testDate.getDay() !== 6) { // 6 = 土曜日になるまで日付を進める
        testDate.setDate(testDate.getDate() + 1);
    }

    // 今日の0時と本番の0時で差分を計算
    let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let diffTime = testDate.getTime() - today.getTime();
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 画面に表示（PC用とスマホ用どちらにも反映）
    document.querySelectorAll(".days-to-test").forEach(el => {
        el.textContent = diffDays > 0 ? diffDays : "当日！";
    });
}
// --- 志望校合格に向けたAI総評・アドバイスを生成する機能 ---
function updateOverallFeedback() {
    let resultYear = document.getElementById("result-year") ? document.getElementById("result-year").value : null;
    let currentResults = (resultYear && subjectResults[resultYear]) ? subjectResults[resultYear] : {};
    let feedbackArea = document.getElementById("overall-feedback-area");
    if (!feedbackArea) return;

    // データが1つもない場合は空にして終了
    if (Object.keys(currentResults).length === 0) {
        feedbackArea.innerHTML = "";
        return;
    }

    let uniKey = document.getElementById("university") ? document.getElementById("university").value : "nagoya";
    let uni = universities[uniKey] || { name: "志望校", border: 50 };
    let uniBorder = uni.border;

    let totalHensachi = 0;
    let count = 0;
    let weakSubjects = [];   // ボーダーから5以上低い科目（伸びしろ大）
    let normalSubjects = []; // ボーダー未満だが惜しい科目
    let strongSubjects = []; // ボーダー以上の科目（武器）

    for (let subject in currentResults) {
        // 合算データなどは除外して、個別の科目だけを判定する
        if (!subjectNames[subject]) continue;

        let hensachi = currentResults[subject].hensachi;
        totalHensachi += hensachi;
        count++;

        let subName = subjectNames[subject];

        if (hensachi < uniBorder - 5) {
            weakSubjects.push(subName);
        } else if (hensachi < uniBorder) {
            normalSubjects.push(subName);
        } else {
            strongSubjects.push(subName);
        }
    }

    if (count === 0) {
        feedbackArea.innerHTML = "";
        return;
    }

    let avgHensachi = totalHensachi / count;
    let diff = (uniBorder - avgHensachi).toFixed(1);

    let title = "📈 志望校合格に向けたAI総評・アドバイス";
    let message = "";
    let bgColor = "#fffbeb";
    let borderColor = "#f59e0b";
    let titleColor = "#b45309";

    if (avgHensachi >= uniBorder + 5) {
        // A判定以上（安全圏）
        message = `現在の総合偏差値は <strong>${avgHensachi.toFixed(1)}</strong> で、${uni.name}の合格安全圏に達しています！非常に素晴らしいペースです。<br>この調子で過去問演習を続け、本番でのケアレスミスをなくす訓練に移行しましょう。`;
        bgColor = "#f0fdf4"; borderColor = "#22c55e"; titleColor = "#166534";
    } else if (avgHensachi >= uniBorder) {
        // B判定以上（ボーダー突破）
        message = `現在の総合偏差値は <strong>${avgHensachi.toFixed(1)}</strong> で、${uni.name}の合格ボーダーに到達しています！合格ラインに乗っていますが、油断は禁物です。<br>`;
        if (weakSubjects.length > 0 || normalSubjects.length > 0) {
            let targets = weakSubjects.concat(normalSubjects);
            message += `特に <strong>${targets.join("、")}</strong> を強化することで、さらに確実な安全圏（A判定）が見えてきます！`;
        }
        bgColor = "#eff6ff"; borderColor = "#3b82f6"; titleColor = "#1e40af";
    } else {
        // C判定以下（ボーダーまであと少し〜頑張り所）
        message = `現在の総合偏差値は <strong>${avgHensachi.toFixed(1)}</strong> です。${uni.name}の合格ボーダー（偏差値${uniBorder}）まで、平均偏差値をあと <strong>${diff}</strong> 上げる必要があります。<br><br>`;

        if (strongSubjects.length > 0) {
            message += `💡 <strong>${strongSubjects.join("、")}</strong> は十分な実力がついており、すでに強力な武器になっています！<br>`;
        }
        if (weakSubjects.length > 0) {
            message += `🔥 まずは伸びしろが非常に大きい <strong>${weakSubjects.join("、")}</strong> の基礎固めや弱点補強を最優先で行い、全体の底上げを図りましょう！`;
        } else if (normalSubjects.length > 0) {
            message += `🔥 どの科目もあと一息です！過去問の復習を徹底し、各科目でプラス1〜2問正解できるようになるだけで一気にボーダーを突破できます！`;
        }
    }

    feedbackArea.innerHTML = `
        <div style="background: ${bgColor}; border-left: 5px solid ${borderColor}; padding: 20px; border-radius: 8px; box-shadow: var(--shadow);">
            <h4 style="margin-top: 0; color: ${titleColor}; font-size: 16px; margin-bottom: 10px;">${title}</h4>
            <p style="margin: 0; font-size: 14px; color: var(--text-main); line-height: 1.6;">${message}</p>
        </div>
    `;
}

// --- Firebase 認証機能 (メールアドレスログイン) ---

// 1. ログイン状態を常に監視する機能
function initAuthListener() {
    if (!window.auth) return;

    window.onAuthStateChanged(window.auth, (user) => {
        let statusArea = document.getElementById("auth-status-area");
        let profileIdDisplay = document.getElementById("display-userid");

        if (user) {
            // ▼ ログイン中の場合
            if (statusArea) {
                statusArea.innerHTML = `
                    <p style="font-size: 14px; color: #16a34a; font-weight: bold; margin-top: 0; margin-bottom: 10px;">✓ ログイン中</p>
                    <p style="font-size: 13px; color: var(--text-main); margin-top: 0; word-break: break-all;">${user.email}</p>
                    <button onclick="logout()" style="padding: 8px 16px; background: #64748b; color: white; border: none; border-radius: 4px; width: 100%;">ログアウト</button>
                `;
            }
            if (profileIdDisplay) profileIdDisplay.textContent = user.email; // プロフィール画面にメアドを表示

            // Firebaseが発行した「絶対に被らない固有ID（uid）」を自分のIDとして保存する
            let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
            profile.userid = user.uid;
            localStorage.setItem("userProfile", JSON.stringify(profile));

        } else {
            // ▼ 未ログインの場合
            if (statusArea) {
                statusArea.innerHTML = `
                    <p style="font-size: 13px; color: #ef4444; margin-top: 0;">未ログインです。<br>ランキング参加やクラウド保存にはログインが必要です。</p>
                    <button onclick="document.getElementById('auth-modal').style.display='flex'" style="padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; width: 100%;">ログイン / 新規登録</button>
                `;
            }
            if (profileIdDisplay) profileIdDisplay.textContent = "未ログイン";
        }
    });
}

// 2. ログイン / 新規登録ボタンが押された時の処理
async function handleAuth(isSignUp) {
    let email = document.getElementById("auth-email").value;
    let password = document.getElementById("auth-password").value;

    if (!email || !password) {
        alert("エラー：メールアドレスとパスワードを入力してください。");
        return;
    }

    try {
        if (isSignUp) {
            // ▼ 新規登録（仮登録）の処理
            let userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);

            // Firebaseから本人確認メールを送信！
            await window.sendEmailVerification(userCredential.user);
            alert("【仮登録が完了しました！】\n\n入力されたメールアドレスに「本人確認メール」を送信しました。メール内のリンクをクリックして本登録を完了させてください。\n（※まだログインはできません）");

            // まだ未認証なので、自動的にログアウト状態にしておく
            await window.signOut(window.auth);

        } else {
            // ▼ ログインの処理
            let userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);

            // ★ メール認証が終わっているか（本登録済みか）チェック！
            if (!userCredential.user.emailVerified) {
                alert("エラー：メールアドレスの認証がまだ完了していません！\n受信した確認メールの中にあるリンクをクリックしてから、再度ログインしてください。");
                await window.signOut(window.auth); // 未認証なら弾く
                return;
            }

            showAchievementToast("ログイン成功", "アカウントにログインしました", "🔑");
        }

        // 成功したらモーダルを閉じて入力欄を空にする
        document.getElementById("auth-modal").style.display = "none";
        document.getElementById("auth-password").value = "";

    } catch (error) {
        console.error("Auth Error:", error);
        let errorMsg = "エラーが発生しました。\n\n";

        if (error.code === 'auth/email-already-in-use') errorMsg = "このメールアドレスは既に登録されています。\n「ログイン」ボタンを押してください。";
        else if (error.code === 'auth/invalid-credential') errorMsg = "メールアドレスかパスワードが間違っています。";
        else if (error.code === 'auth/weak-password') errorMsg = "パスワードは6文字以上で設定してください。";
        else if (error.code === 'auth/operation-not-allowed') errorMsg = "【設定エラー】Firebaseの管理画面で「メール/パスワード」の認証機能がオンになっていません。";
        else errorMsg += "エラーコード: " + error.code + "\n" + error.message;

        alert(errorMsg);
    }
}

// 3. パスワードを忘れたときの処理
async function resetPassword() {
    let email = document.getElementById("auth-email").value;

    // アドレス欄が空のまま押されたら警告
    if (!email) {
        alert("パスワードを再設定したいメールアドレスを入力してから、「パスワードを忘れた方はこちら」を押してください。");
        return;
    }

    try {
        await window.sendPasswordResetEmail(window.auth, email);
        alert("パスワード再設定メールを送信しました！\nメールの案内に従って新しいパスワードを設定してください。");
        document.getElementById("auth-modal").style.display = "none";
    } catch (error) {
        console.error("Reset Password Error:", error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            // セキュリティ上、存在しないメアドを入れてもわざと「間違っています」と濁すのが一般的です
            alert("エラー：入力されたメールアドレスは登録されていないか、間違っています。");
        } else {
            alert("エラーが発生しました。\n" + error.message);
        }
    }
}

// 3. ログアウト処理
function logout() {
    window.signOut(window.auth).then(() => {
        showAchievementToast("ログアウト", "ログアウトしました", "👋");
    });
}

// アプリ起動時にログイン監視をスタートするよう追加
document.addEventListener("DOMContentLoaded", () => {
    // Firebaseの読み込みが終わるのを少し待ってから実行
    setTimeout(initAuthListener, 500);
});
// --- フィードバック送信機能 ---
async function submitFeedback() {
    let textarea = document.getElementById("feedback-text");
    let text = textarea.value.trim();

    // 入力欄が空っぽの場合は弾く
    if (!text) {
        showCustomConfirm("エラー", "メッセージを入力してから送信してください。", "OK", "", true);
        return;
    }

    // 誰が送ってくれたのか分かるように、ローカルのプロフィール情報を取得
    let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    let userId = profile.userid || "未ログインゲスト";
    let nickname = profile.nickname || "名無しさん";

    try {
        // Firebaseの "feedback" という新しいフォルダ（コレクション）にデータを追加
        await window.addDoc(window.collection(window.db, "feedback"), {
            userid: userId,
            nickname: nickname,
            message: text,
            createdAt: new Date()
        });

        // 成功したらオシャレな通知を出して、入力欄を空にする
        showAchievementToast("送信完了", "貴重なご意見ありがとうございます！", "💌");
        textarea.value = "";

    } catch (error) {
        console.error("フィードバック送信エラー: ", error);
        showCustomConfirm("通信エラー", "送信に失敗しました。時間をおいて再度お試しください。", "OK", "", true);
    }
}

// --- ★新規追加：科目ごとの自己分析メモをリアルタイム保存する関数 ---
function saveSubjectMemo(year, subject, text) {
    if (subjectResults[year] && subjectResults[year][subject]) {
        subjectResults[year][subject].memo = text;
        // ローカルストレージに一括保存（上書き）
        localStorage.setItem("subjectResults", JSON.stringify(subjectResults));
    }
}
// HTMLの読み込みが完了した直後にもう一度カウントダウンを計算する（念押し）
document.addEventListener("DOMContentLoaded", updateCountdown);

// ==========================================
// ★ 成績確認用の年度読み込み（プラン連動版にアップデート）
// ==========================================
function loadResultYears() {
    let yearSelect = document.getElementById("result-year");
    if (!yearSelect) return;
    let currentVal = yearSelect.value;
    yearSelect.innerHTML = "";

    // プランが作成されている年度だけを選択肢にする
    let years = Object.keys(examPlans).sort();
    years.forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}年度</option>`;
    });

    if (years.includes(currentVal)) {
        yearSelect.value = currentVal;
    } else if (years.length > 0) {
        yearSelect.value = years[0];
    }
}

// ==========================================
// ★ 新機能：過去の点数を手動入力するプログラム
// ==========================================
function loadDirectYears() {
    let yearSelect = document.getElementById("direct-year");
    if (!yearSelect) return;
    yearSelect.innerHTML = "";
    let years = Object.keys(examPlans).sort();
    if (years.length === 0) {
        yearSelect.innerHTML = `<option value="">プラン未作成</option>`;
        return;
    }
    years.forEach(y => yearSelect.innerHTML += `<option value="${y}">${y}年度</option>`);
    updateDirectSubjects();
}

function updateDirectSubjects() {
    let year = document.getElementById("direct-year").value;
    let subjSelect = document.getElementById("direct-subject");
    subjSelect.innerHTML = "";
    if (!year || !examPlans[year]) return;

    examPlans[year].subjects.forEach(sub => {
        subjSelect.innerHTML += `<option value="${sub}">${subjectNames[sub]}</option>`;
    });
}

function saveDirectScore() {
    let year = document.getElementById("direct-year").value;
    let subject = document.getElementById("direct-subject").value;
    let score = Number(document.getElementById("direct-score").value);

    if (!year || !subject) {
        alert("年度と科目を選択してください。");
        return;
    }
    if (isNaN(score) || score < 0 || score > subjectMax[subject]) {
        alert(`正しい点数を入力してください（0〜${subjectMax[subject]}点）。`);
        return;
    }

    if (!subjectResults[year]) subjectResults[year] = {};

    // 過去問データがない科目（化学など）は、平均点を半分の点数として仮計算する
    let avg = pastTests[subject] && pastTests[subject][year] ? pastTests[subject][year].avg : subjectMax[subject] / 2;
    let sd = pastTests[subject] && pastTests[subject][year] ? pastTests[subject][year].sd : 15;
    let hensachi = ((score - avg) / sd) * 10 + 50;

    subjectResults[year][subject] = {
        score: score,
        avg: avg,
        sd: sd,
        hensachi: hensachi,
        sectionResults: [],
        details: [],
        isDirectInput: true // 手動入力フラグ
    };

    localStorage.setItem("subjectResults", JSON.stringify(subjectResults));

    document.getElementById('direct-input-section').style.display = 'none';
    if (typeof showAchievementToast === 'function') showAchievementToast("成績登録", "手動で点数を登録しました！", "✍️");

    loadResultYears();
    document.getElementById("result-year").value = year;
    updateReport();
    if (typeof updateChart === 'function') updateChart();
    if (typeof updateJudge === 'function') updateJudge();

    // 手動入力の送信後も、自動で成績確認タブに移動！
    switchTab('tab-results');
}
