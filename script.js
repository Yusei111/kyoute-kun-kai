let pastTests = {
    japanese: {
        2022: {
            answers: "000000000000000000000000000000000000000000000000",
            defaultPoint: 4,
            avg: 110,
            sd: 20
        },
        2023: {
            answers: "000000000000000000000000000000000000000000000000",
            defaultPoint: 4,
            avg: 110,
            sd: 20
        }
    },
    englishR: {
        2022: {
            answers: "1324123443211324123443211324123443211324",
            defaultPoint: 2.5,
            avg: 61.8,
            sd: 15.4
        }
    },
    englishL: {
        2022: {
            answers: "12341234432113241234432113241234",
            defaultPoint: 3,
            avg: 57.2,
            sd: 14.8
        }
    },
    math1A: {
        2022: {
            answers: "1234512345123451234512345",
            defaultPoint: 4,
            avg: 48.5,
            sd: 16.2,
            // ★ 追加: 大問ごとの設問数を指定する
            sections: [
                { name: "第1問", count: 5 },  // 最初の5問
                { name: "第2問", count: 5 },  // 次の5問
                { name: "第3問", count: 5 },
                { name: "第4問", count: 5 },
                { name: "第5問", count: 5 }
            ]
        }
    },
    math2BC: {
        2022: {
            answers: "1234512345123451234512345",
            defaultPoint: 4,
            avg: 51.3,
            sd: 15.9
        }
    }
};

let subjectMax = {
    japanese: 200,
    englishR: 100,
    englishL: 100,
    math1A: 100,
    math2BC: 100,
    physics: 100,
    chemistry: 100,
    info: 100,
    geography: 100
};

// ★ ここで科目の名前を「1つ」にまとめました
let subjectNames = {
    japanese: "国語",
    englishR: "英語R",
    englishL: "英語L",
    math1A: "数ⅠA",
    math2BC: "数ⅡBC",
    physics: "物理",
    chemistry: "化学",
    info: "情報",
    geography: "地理"
};

let universities = {
    nagoya: {
        name: "名古屋大学",
        border: 65
    },
    nagoyaTech: {
        name: "名古屋工業大学",
        border: 60
    },
    nanzan: {
        name: "南山大学",
        border: 55
    }
};

// アプリ全体で使う変数の準備
let userAnswers = [];
let subjectResults = {};
let radarChart = null;

// ↓この下から function updateSheet() { ... が続きます


function updateSheet() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;
    let data = pastTests[subject][year];

    let container = document.getElementById("sheet-container");
    container.innerHTML = "";
    userAnswers = [];

    let fastInput = document.getElementById("fast-answer-input");
    if (fastInput) fastInput.value = "";

    // マークシート全体の枠
    let markSheetBlock = document.createElement("div");
    markSheetBlock.className = "mark-sheet-block";

    // 設問数ぶんループして、1行ずつ作る
    for (let q = 0; q < data.answers.length; q++) {
        let row = document.createElement("div");
        row.className = "mark-row";
        row.dataset.q = q;

        // 左側：解答番号
        let qNum = document.createElement("div");
        qNum.className = "q-num";
        qNum.textContent = (q + 1);
        row.appendChild(qNum);

        // 右側：マークの丸を並べるコンテナ
        let bubbles = document.createElement("div");
        bubbles.className = "bubbles";

        // 0〜9の丸を生成
        for (let i = 0; i < 10; i++) {
            let bubble = document.createElement("div");
            bubble.className = "choice bubble";
            bubble.textContent = i;
            bubbles.appendChild(bubble);
        }

        row.appendChild(bubbles);
        markSheetBlock.appendChild(row);
    }

    container.appendChild(markSheetBlock);
}


// ② クリックして色を塗る処理（divの構造に合わせて少し修正）
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("choice")) {
        // クリックされた丸が含まれる「行」を取得
        let row = e.target.closest(".mark-row");
        let q = row.dataset.q;

        // その行の他の丸の色をリセット
        row.querySelectorAll(".choice").forEach(c => {
            c.classList.remove("selected");
        });

        // クリックした丸を塗りつぶす
        e.target.classList.add("selected");
        userAnswers[q] = Number(e.target.textContent);

        if (typeof updateFastInputDisplay === 'function') {
            updateFastInputDisplay();
        }
    }
});


function gradeTest() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;
    let data = pastTests[subject][year];
    let score = 0;

    let details = [];
    let sectionResults = [];
    let currentQ = 0;
    let sections = data.sections || [{ name: "全問", count: data.answers.length }];

    sections.forEach(sec => {
        let secData = { name: sec.name, score: 0, maxScore: 0, correctCount: 0, totalCount: sec.count };
        for (let i = 0; i < sec.count; i++) {
            if (currentQ >= data.answers.length) break;
            let qIndex = currentQ;
            let ans = Number(data.answers[qIndex]);
            let userAns = userAnswers[qIndex];
            let point = (data.exceptions && data.exceptions[qIndex] !== undefined) ? data.exceptions[qIndex] : data.defaultPoint;
            let isCorrect = (userAns === ans);

            if (isCorrect) {
                secData.score += point;
                secData.correctCount++;
                score += point;
            }
            secData.maxScore += point;
            details.push({ qNum: qIndex + 1, isCorrect: isCorrect, point: isCorrect ? point : 0 });
            currentQ++;
        }
        sectionResults.push(secData);
    });

    let hensachi = ((score - data.avg) / data.sd) * 10 + 50;

    let isFirstTime = false;
    if (!subjectResults[year] || !subjectResults[year][subject]) {
        isFirstTime = true;
    }

    // ★ 年度ごとの箱がなければ新しく作る
    if (!subjectResults[year]) {
        subjectResults[year] = {};
    }

    subjectResults[year][subject] = {
        score: score, avg: data.avg, sd: data.sd, hensachi: hensachi,
        sectionResults: sectionResults, details: details
    };

    localStorage.setItem("subjectResults", JSON.stringify(subjectResults));

    // ★ 採点後、いま解いた年度を自動的に選択状態にする
    loadResultYears();
    document.getElementById("result-year").value = year;

    playSound('grade');

    updateReport();
    updateChart();
    updateJudge();
    updateTopHensachi();
    if (isFirstTime) {
        addExp(100);
    } else {
        setTimeout(() => {
            showAchievementToast("成績更新", "最新の解答で成績を上書きしました（EXP獲得済み）", "📝");
        }, 500);
    }

    clearInterval(timerInterval);
    backToSetup(true);
    switchTab('tab-results');
}


function updateReport() {
    let resultYear = document.getElementById("result-year") ? document.getElementById("result-year").value : null;
    let currentResults = (resultYear && subjectResults[resultYear]) ? subjectResults[resultYear] : {};

    let body = document.getElementById("reportBody");
    body.innerHTML = "";
    let total = 0;

    for (let subject in currentResults) {
        let r = currentResults[subject];
        total += r.score;
        let row = `<tr>
            <td>${subjectNames[subject] || subject}</td>
            <td>${r.score}</td><td>${r.avg}</td><td>${r.sd}</td><td>${r.hensachi.toFixed(1)}</td>
        </tr>`;
        body.innerHTML += row;
    }

    document.getElementById("totalScore").textContent = total;

    if (currentResults.englishR || currentResults.englishL) {
        let rScore = currentResults.englishR ? currentResults.englishR.score : 0;
        let lScore = currentResults.englishL ? currentResults.englishL.score : 0;
        let engTotal = rScore + lScore;
        body.innerHTML += `<tr style="background: #f0fdf4; font-weight: bold; border-top: 2px solid #bbf7d0;">
            <td style="color: #16a34a;">【合算】英語総合</td><td><span style="font-size: 16px; color: #16a34a;">${engTotal}</span> / 200</td><td>-</td><td>-</td><td>-</td></tr>`;
    }

    if (currentResults.math1A || currentResults.math2BC) {
        let m1Score = currentResults.math1A ? currentResults.math1A.score : 0;
        let m2Score = currentResults.math2BC ? currentResults.math2BC.score : 0;
        let mathTotal = m1Score + m2Score;
        body.innerHTML += `<tr style="background: #f0fdf4; font-weight: bold;">
            <td style="color: #16a34a;">【合算】数学総合</td><td><span style="font-size: 16px; color: #16a34a;">${mathTotal}</span> / 200</td><td>-</td><td>-</td><td>-</td></tr>`;
    }

    let detailArea = document.getElementById("detailed-results-area");
    if (!detailArea) return;
    detailArea.innerHTML = "<h3 style='border-bottom: 2px solid var(--border); padding-bottom: 10px;'>大問別・設問別 詳細レポート</h3>";

    if (Object.keys(currentResults).length === 0) {
        detailArea.innerHTML += "<p style='color: var(--text-muted);'>この年度の成績データはありません。</p>";
        return;
    }

    for (let subject in currentResults) {
        let r = currentResults[subject];
        if (!r.sectionResults || !r.details) continue;

        let html = `<div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: var(--shadow);">`;
        html += `<h4 style="margin-top: 0; color: var(--primary-dark);">${subjectNames[subject] || subject}</h4>`;
        if (r.isDirectInput) {
            html += `<p style="color: var(--text-muted); font-size: 14px;">※この科目は手動で点数が入力されたため、大問・設問ごとの詳細データや弱点分析はありません。</p>`;
            html += `</div>`;
            detailArea.innerHTML += html;
            continue;
        }
        html += `<table class="scoreTable" style="margin-bottom: 25px; box-shadow: none;"><thead><tr><th>大問</th><th>得点 / 満点</th><th>正答率</th></tr></thead><tbody>`;
        r.sectionResults.forEach(sec => {
            let rate = sec.totalCount > 0 ? Math.round((sec.correctCount / sec.totalCount) * 100) : 0;
            html += `<tr><td style="font-weight: bold;">${sec.name}</td><td><strong style="color: var(--accent); font-size: 16px;">${sec.score}</strong> / ${sec.maxScore}</td><td>${rate}%</td></tr>`;
        });
        html += `</tbody></table>`;

        html += `<h5 style="margin-bottom: 10px; color: var(--text-muted);">設問ごとの判定</h5><div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
        r.details.forEach(d => {
            let mark = d.isCorrect ? `<span style="color: #16a34a; font-size: 20px; font-weight: bold;">〇</span>` : `<span style="color: #ef4444; font-size: 20px; font-weight: bold;">×</span>`;
            let bg = d.isCorrect ? `#f0fdf4` : `#fef2f2`;
            html += `<div style="border: 1px solid var(--border); border-radius: 6px; padding: 8px 5px; width: 45px; text-align: center; background: ${bg};"><div style="font-size: 11px; color: var(--text-muted);">問${d.qNum}</div><div style="margin: 2px 0;">${mark}</div><div style="font-size: 11px; font-weight: bold; color: ${d.isCorrect ? '#16a34a' : '#ef4444'};">${d.point}点</div></div>`;
        });

        let weakPoints = [];
        r.sectionResults.forEach(sec => {
            let rate = sec.totalCount > 0 ? (sec.correctCount / sec.totalCount) : 0;
            // 正答率60%未満を「弱点」としてピックアップする
            if (rate < 0.6) {
                weakPoints.push(sec.name);
            }
        });

        if (weakPoints.length > 0) {
            html += `<div style="margin-top: 20px; padding: 15px; background: #fffbeb; border-left: 5px solid #f59e0b; border-radius: 4px;">
                        <h5 style="margin: 0 0 5px 0; color: #b45309; font-size: 15px;">💡 AI弱点分析アドバイス</h5>
                        <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
                            今回は <strong>${weakPoints.join('、')}</strong> の正答率が少し低めでした。<br>
                            この単元の基礎事項を教科書や参考書で復習し、類似問題を2〜3問解き直すだけで、次回の点数が一気に安定します！
                        </p>
                     </div>`;
        } else {
            html += `<div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 5px solid #22c55e; border-radius: 4px;">
                        <h5 style="margin: 0 0 5px 0; color: #166534; font-size: 15px;">🌟 AI分析レポート</h5>
                        <p style="margin: 0; font-size: 13px; color: #14532d; line-height: 1.5;">
                            素晴らしい成績です！全ての大問で高い正答率をキープできています。<br>
                            弱点が見当たりません。この調子で他の年度や難易度の高い問題にも挑戦し、得点力を盤石にしましょう！
                        </p>
                     </div>`;
        }
        html += `</div>`;
        let memoValue = r.memo || ""; // 保存されたメモの復元用
        html += `<div style="margin-top: 25px; border-top: 2px dashed var(--border); padding-top: 18px; width: 100%; clear: both;">
                    <label style="display: block; font-size: 14px; font-weight: bold; color: var(--text-main); margin-bottom: 8px;">📝 自己分析メモ（間違えた原因や復習のポイント）</label>
                    <textarea oninput="saveSubjectMemo('${resultYear}', '${subject}', this.value)" 
                        placeholder="例：数学ⅠA第3問の確率。補事象（少なくとも〜）を使う発想が抜けていた。" 
                        style="width: 100%; min-width: 100%; max-width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; box-sizing: border-box; font-family: inherit; font-size: 14px; line-height: 1.5; resize: vertical; min-height: 90px; background: #f8fafc; color: var(--text-main);">${memoValue}</textarea>
                 </div>`;

        html += `</div>`; // 科目カード（白いボックス）自体を閉じます
        detailArea.innerHTML += html;

    }

}

function updateChart() {
    let resultYear = document.getElementById("result-year") ? document.getElementById("result-year").value : null;
    let currentResults = (resultYear && subjectResults[resultYear]) ? subjectResults[resultYear] : {};

    // ★追加：志望校のデータを取得する
    let uniKey = document.getElementById("university") ? document.getElementById("university").value : "nagoya";
    let uniBorder = universities[uniKey] ? universities[uniKey].border : 65;

    let labels = [];
    let myData = [];
    let targetData = [];
    let avgData = [];

    // 受験した（成績データがある）科目だけをグラフの軸として追加する
    for (let key in subjectNames) {
        if (currentResults[key]) {
            labels.push(subjectNames[key]);

            // 1. 自分の得点率
            let myPercent = currentResults[key].score / subjectMax[key] * 100;
            myData.push(myPercent);

            // 2. 全国平均の得点率
            let avgPercent = currentResults[key].avg / subjectMax[key] * 100;
            avgData.push(avgPercent);

            // 3. 志望校目標の得点率（志望校の偏差値ボーダーから各科目の目標点を逆算）
            let targetScore = currentResults[key].avg + (uniBorder - 50) * currentResults[key].sd / 10;
            let targetPercent = targetScore / subjectMax[key] * 100;
            if (targetPercent > 100) targetPercent = 100; // 満点(100%)を超えないように調整
            targetData.push(targetPercent);
        }
    }

    if (labels.length === 0) {
        labels = ["未受験"];
        myData = [0];
        targetData = [0];
        avgData = [0];
    }

    if (radarChart) radarChart.destroy();

    radarChart = new Chart(document.getElementById("radarChart"), {
        type: "radar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "あなたの得点率",
                    data: myData,
                    backgroundColor: 'rgba(59, 130, 246, 0.4)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                    order: 3 // ★変更：数字を大きくして、一番後ろ（背面）に配置する
                },
                {
                    label: "志望校目標",
                    data: targetData,
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    order: 1 // ★変更：数字を小さくして、一番手前（前面）に配置する
                },
                {
                    label: "全国平均",
                    data: avgData,
                    backgroundColor: 'transparent', // ★変更：塗りつぶしを消して「透明（線のみ）」にする
                    borderColor: 'rgba(100, 116, 139, 1)',
                    pointBackgroundColor: 'rgba(100, 116, 139, 1)',
                    borderWidth: 2, // ★変更：線が見やすいように少し太くする
                    order: 2 // ★変更：あなたの得点よりも手前（前面）に配置する
                }
            ]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, // ★変更：複数のデータがあるので凡例（色の説明）を表示する
                    position: 'bottom',
                    labels: {
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function updateJudge() {
    let resultYear = document.getElementById("result-year") ? document.getElementById("result-year").value : null;
    let currentResults = (resultYear && subjectResults[resultYear]) ? subjectResults[resultYear] : {};
    let total = 0; let count = 0;
    let totalSD = 0; // ★ 点数計算用に追加

    for (let subject in currentResults) {
        total += currentResults[subject].hensachi;
        totalSD += currentResults[subject].sd;
        count++;
    }

    let uniKey = document.getElementById("university").value;
    let uni = universities[uniKey];
    let judge = "-";
    let avgHensachi = 0;
    let nextRankHensachi = 0;
    let nextRankLetter = "";

    if (count > 0) {
        avgHensachi = total / count;
        if (avgHensachi >= uni.border + 5) { judge = "A"; nextRankLetter = "MAX"; }
        else if (avgHensachi >= uni.border) { judge = "B"; nextRankHensachi = uni.border + 5; nextRankLetter = "A"; }
        else if (avgHensachi >= uni.border - 5) { judge = "C"; nextRankHensachi = uni.border; nextRankLetter = "B"; }
        else if (avgHensachi >= uni.border - 10) { judge = "D"; nextRankHensachi = uni.border - 5; nextRankLetter = "C"; }
        else { judge = "E"; nextRankHensachi = uni.border - 10; nextRankLetter = "D"; }
    }

    document.getElementById("judgeLetter").textContent = judge;
    document.getElementById("judgeUniversity").textContent = uni.name;

    // ★ 追加：次の判定までの点数計算と表示
    let nextPointsElem = document.getElementById("judgeNextPoints");
    let rankElem = document.getElementById("judgeUniRank");

    if (nextPointsElem && rankElem) {
        if (count === 0) {
            nextPointsElem.innerHTML = "--";
            rankElem.innerHTML = "--";
        } else if (judge === "A") {
            nextPointsElem.innerHTML = "すでに最高判定です！🎉";
        } else {
            // 不足している合計偏差値を計算し、標準偏差から必要点数を逆算
            let diffHensachiTotal = (nextRankHensachi * count) - total;
            let avgSD = totalSD / count;
            let diffPoints = Math.ceil(diffHensachiTotal * (avgSD / 10)); // 切り上げ
            let diffAvg = (nextRankHensachi - avgHensachi).toFixed(1);

            nextPointsElem.innerHTML = `${nextRankLetter}判定まで <strong>あと約 ${diffPoints} 点</strong> <span style="font-size: 11px; color: #fda4af;">(平均偏差値 +${diffAvg})</span>`;
        }

        // 志望校内順位の取得を呼び出す
        if (count > 0 && resultYear) {
            fetchUniversityRank(resultYear, uniKey, avgHensachi);
        }
    }
    updateOverallFeedback();
}

// ★ 新規追加：Firebaseから同じ志望校のライバルを取得して順位を計算する関数
async function fetchUniversityRank(year, uniKey, myAvgHensachi) {
    let rankElem = document.getElementById("judgeUniRank");
    if (!rankElem) return;

    rankElem.textContent = "集計中...";

    if (!window.db) {
        rankElem.textContent = "オフライン";
        return;
    }

    try {
        const q = window.query(window.collection(window.db, "scores"), window.where("year", "==", year));
        const querySnapshot = await window.getDocs(q);

        let userStats = {};

        querySnapshot.forEach((doc) => {
            let data = doc.data();
            // 同じ志望校のデータのみを抽出
            if (data.university === uniKey) {
                if (!userStats[data.userid]) {
                    userStats[data.userid] = { total: 0, count: 0 };
                }
                userStats[data.userid].total += data.hensachi;
                userStats[data.userid].count++;
            }
        });

        let myProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        let myUserId = myProfile.userid || "guest_me";

        // 画面に表示されている最新の自分の成績リストを合流させる
        userStats[myUserId] = { avg: myAvgHensachi };

        // 全ライバルの平均偏差値リストを作成
        let avgList = [];
        for (let uid in userStats) {
            if (uid === myUserId) {
                avgList.push(myAvgHensachi);
            } else {
                let avg = userStats[uid].total / userStats[uid].count;
                avgList.push(avg);
            }
        }

        // 偏差値が高い順に並び替え
        avgList.sort((a, b) => b - a);

        // 自分の順位を計算
        let myRank = avgList.indexOf(myAvgHensachi) + 1;
        let totalRivals = avgList.length;

        rankElem.innerHTML = `<strong style="font-size: 16px;">${myRank}</strong> 位 / <span style="font-size: 12px;">${totalRivals} 人中</span>`;

    } catch (error) {
        console.error("順位取得エラー: ", error);
        rankElem.textContent = "取得失敗";
    }
}


function resetAll() {

    subjectResults = {};

    document.getElementById("reportBody").innerHTML = "";
    document.getElementById("totalScore").textContent = "";
    document.getElementById("judgeLetter").textContent = "-";

    if (radarChart) {
        radarChart.destroy();
    }

    localStorage.removeItem("subjectResults");
}


window.onload = function () {
    updateCountdown();
    loadYears();
    let saved = localStorage.getItem("subjectResults");
    if (saved) {
        subjectResults = JSON.parse(saved);

        // ★ 古いデータ形式（年度が設定されていないデータ）を「2022年度」として救済・変換する
        if (subjectResults.japanese || subjectResults.englishR || subjectResults.math1A) {
            let oldData = subjectResults;
            subjectResults = { "2022": oldData };
            localStorage.setItem("subjectResults", JSON.stringify(subjectResults));
        }

        loadResultYears();
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
                    university: profile.university || "nagoya",
                    updatedAt: new Date()
                });
            } else {
                await window.addDoc(scoresRef, {
                    userid: profile.userid, nickname: profile.nickname, subject: subject, year: year,
                    score: resultData.score, hensachi: resultData.hensachi,
                    prefecture: profile.prefecture || "", school: profile.school || "", grade: profile.grade || "",
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

        // 4. 画面のテーブルに1件ずつ追加していく
        let rank = 1;
        displayScores.forEach((data) => {
            let hensachi = data.hensachi ? data.hensachi.toFixed(1) : "-";

            // ★順位の表示方法（王冠レイアウト）を決定する
            let rankText = "";
            if (rank === 1) {
                rankText = `<span class="crown gold">👑 1位</span>`;
            } else if (rank === 2) {
                rankText = `<span class="crown silver">👑 2位</span>`;
            } else if (rank === 3) {
                rankText = `<span class="crown bronze">👑 3位</span>`;
            } else {
                rankText = `<span>${rank}位</span>`;
            }

            let row = `<tr>
                <td style="vertical-align: middle;">${rankText}</td>
                <td>${data.nickname}<br><span style="font-size: 12px; color: #64748b;">${data.school || "高校未設定"}</span></td>
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
    // ユーザーIDはFirebaseで自動管理されるため、画面からの取得は不要
    let nickname = document.getElementById("profile-nickname").value;
    let university = document.getElementById("profile-university").value;
    let prefecture = document.getElementById("profile-prefecture").value;
    let school = document.getElementById("profile-school").value;
    let grade = document.getElementById("profile-grade").value;

    let isAgreed = document.getElementById("agree-terms").checked;
    if (!isAgreed) {
        showCustomConfirm("確認", "サービスを利用するには、利用規約とプライバシーポリシーへの同意（チェック）が必要です。", "OK", "", true);
        return;
    }

    if (nickname.trim() === "") {
        alert("ニックネームを入力してください。");
        return;
    }

    // すでに保存されているプロフィール（FirebaseのIDなど）を呼び出す
    let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");

    // 入力された情報だけを上書き更新する
    profile.nickname = nickname;
    profile.university = university;
    profile.prefecture = prefecture;
    profile.school = school;
    profile.grade = grade;

    localStorage.setItem("userProfile", JSON.stringify(profile));
    alert("プロフィールを保存しました！");
    applyProfile();
}

function applyProfile() {
    let savedProfile = localStorage.getItem("userProfile");

    if (savedProfile) {
        let profile = JSON.parse(savedProfile);

        // 1. 設定画面の入力を復元（消えたuserid入力欄の処理を削除しました）
        document.getElementById("profile-nickname").value = profile.nickname || "";
        document.getElementById("profile-university").value = profile.university || "nagoya";
        document.getElementById("profile-prefecture").value = profile.prefecture || "";
        document.getElementById("profile-school").value = profile.school || "";
        document.getElementById("profile-grade").value = profile.grade || "3";

        // 2. クラウド保存用の見えない入力欄へ反映
        let scoreNickname = document.getElementById("nickname");
        if (scoreNickname) scoreNickname.value = profile.nickname;

        let scoreUni = document.getElementById("university");
        if (scoreUni) {
            scoreUni.value = profile.university;
            if (Object.keys(subjectResults).length > 0) updateJudge();
        }

        // 3. ゲーム風プロフィール画面への反映
        let displayNickname = document.getElementById("display-nickname");
        let displayUserid = document.getElementById("display-userid");
        let displayAvatar = document.getElementById("display-avatar");

        if (displayNickname) displayNickname.textContent = profile.nickname;

        // ログインしていない場合は未設定にする
        if (displayUserid) {
            displayUserid.textContent = profile.userid ? profile.userid : "未設定";
        }

        if (displaySchool) {
            displaySchool.textContent = profile.school ? profile.school : "未設定";
        }

        // ユーザーIDを元に、DiceBear APIで固有のアバター画像を生成する
        if (displayAvatar && profile.userid) {
            displayAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.userid}`;
        }
    }
    updateLevelUI();
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

    // 入力チェック
    if (!target || !timeLimit) {
        alert("目標得点と制限時間を入力してください。");
        return;
    }

    // 画面の表示切り替え
    document.getElementById("exam-setup-section").style.display = "none";
    document.getElementById("exam-sheet-section").style.display = "block";

    // 上部のステータスバーを更新
    document.getElementById("display-exam-subject").textContent = subjectNames[subject];
    document.getElementById("display-exam-year").textContent = year + "年度";
    document.getElementById("display-target-score").textContent = target;

    // マークシートを生成
    updateSheet();

    // タイマーのセットと開始
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
        // 1. もしスマホの予測変換で「全角数字」が入ってしまっても、裏でこっそり「半角」に直す
        let val = this.value.replace(/[０-９]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });

        // 2. 数字とスペース以外の文字（ひらがな等）を自動で削除する
        val = val.replace(/[^0-9\s]/g, '');

        let dataLength = document.querySelectorAll(".mark-row").length;

        // 3. 問題数より多く入力できないようにカット
        if (val.length > dataLength) {
            val = val.slice(0, dataLength);
        }

        this.value = val; // 綺麗な数字だけを入力欄に戻す

        // 4. すべてのマークシート行の色を一旦リセット
        document.querySelectorAll(".mark-row").forEach(row => {
            row.querySelectorAll(".choice").forEach(c => c.classList.remove("selected"));
        });

        // 5. 1文字ずつ読み取って userAnswers とマークシートを自動で塗りつぶす
        userAnswers = [];
        for (let i = 0; i < val.length; i++) {
            let char = val[i];
            if (char === ' ') continue; // スペース（未解答）はスキップ

            let num = Number(char);
            userAnswers[i] = num;

            let row = document.querySelector(`.mark-row[data-q="${i}"]`);
            if (row) {
                let bubbles = row.querySelectorAll(".choice");
                bubbles.forEach(b => {
                    if (Number(b.textContent) === num) {
                        b.classList.add("selected");
                    }
                });
            }
        }
    });
}

// 逆に、マークシートを直接クリックした時に、入力欄の数字も連動させる関数
function updateFastInputDisplay() {
    let fastInput = document.getElementById("fast-answer-input");
    if (!fastInput) return;

    let str = "";
    let dataLength = document.querySelectorAll(".mark-row").length;
    for (let i = 0; i < dataLength; i++) {
        if (userAnswers[i] !== undefined) {
            str += userAnswers[i];
        } else {
            str += " "; // 未解答の箇所はスペースで位置を保つ
        }
    }
    fastInput.value = str.trimEnd(); // 末尾の不要なスペースを削って表示
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
