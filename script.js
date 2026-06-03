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
            sd: 16.2
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
    }
});


function gradeTest() {
    let subject = document.getElementById("subject").value;
    let year = document.getElementById("year").value;

    let data = pastTests[subject][year];
    let score = 0;

    // ★ 変更点：通常採点（文字列のループと例外配点への対応）
    for (let i = 0; i < data.answers.length; i++) {
        // 文字列のi番目を数値に変換
        let ans = Number(data.answers[i]);

        if (userAnswers[i] === ans) {
            // 例外配点（exceptions）が存在し、かつ該当の問題に点数が設定されていればそれを使い、なければ基本配点を使う
            let point = (data.exceptions && data.exceptions[i] !== undefined)
                ? data.exceptions[i]
                : data.defaultPoint;
            score += point;
        }
    }

    // 完答採点
    if (data.completeSets) {
        data.completeSets.forEach(set => {
            let correct = true;

            set.questions.forEach(q => {
                // ★ 変更点：data.answers[q] を Number() で数値化して比較
                if (userAnswers[q] !== Number(data.answers[q])) {
                    correct = false;
                }
            });

            if (correct) {
                score += set.point;
            }
        });
    }

    let hensachi = ((score - data.avg) / data.sd) * 10 + 50;

    subjectResults[subject] = {
        score: score,
        avg: data.avg,
        sd: data.sd,
        hensachi: hensachi
    };

    updateReport();
    updateChart();
    updateJudge();

    localStorage.setItem("subjectResults", JSON.stringify(subjectResults));
    switchTab('tab-results');
}


function updateReport() {
    let body = document.getElementById("reportBody");
    body.innerHTML = "";
    let total = 0;

    // 1. まずは入力された個別科目を1行ずつ表示
    for (let subject in subjectResults) {
        let r = subjectResults[subject];
        total += r.score;

        let row = `<tr>
            <td>${subjectNames[subject] || subject}</td>
            <td>${r.score}</td>
            <td>${r.avg}</td>
            <td>${r.sd}</td>
            <td>${r.hensachi.toFixed(1)}</td>
        </tr>`;
        body.innerHTML += row;
    }

    // 全科目の単純合計点を反映
    document.getElementById("totalScore").textContent = total;

    // 2. ★ 英語リーディングとリスニングを足して「200点満点」の別枠行を作る
    if (subjectResults.englishR || subjectResults.englishL) {
        let rScore = subjectResults.englishR ? subjectResults.englishR.score : 0;
        let lScore = subjectResults.englishL ? subjectResults.englishL.score : 0;
        let engTotal = rScore + lScore;

        let engRow = `<tr style="background: #f0fdf4; font-weight: bold; border-top: 2px solid #bbf7d0;">
            <td style="color: #16a34a;">【合算】英語総合</td>
            <td><span style="font-size: 16px; color: #16a34a;">${engTotal}</span> / 200</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
        </tr>`;
        body.innerHTML += engRow;
    }

    // 3. ★ 数学ⅠAと数学ⅡBCを足して「200点満点」の別枠行を作る
    if (subjectResults.math1A || subjectResults.math2BC) {
        let m1Score = subjectResults.math1A ? subjectResults.math1A.score : 0;
        let m2Score = subjectResults.math2BC ? subjectResults.math2BC.score : 0;
        let mathTotal = m1Score + m2Score;

        let mathRow = `<tr style="background: #f0fdf4; font-weight: bold;">
            <td style="color: #16a34a;">【合算】数学総合</td>
            <td><span style="font-size: 16px; color: #16a34a;">${mathTotal}</span> / 200</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
        </tr>`;
        body.innerHTML += mathRow;
    }
}


function updateChart() {

    let labels = Object.values(subjectNames);

    let data = [];

    for (let key in subjectNames) {

        if (subjectResults[key]) {

            let percent = subjectResults[key].score / subjectMax[key] * 100;

            data.push(percent);

        } else {

            data.push(0);

        }

    }

    if (radarChart) {
        radarChart.destroy();
    }

    radarChart = new Chart(

        document.getElementById("radarChart"),

        {

            type: "radar",

            data: {

                labels: labels,

                datasets: [{

                    label: "得点率(%)",

                    data: data

                }]

            },

            options: {

                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }

            }

        });

}


function updateJudge() {

    let total = 0;
    let count = 0;

    for (let subject in subjectResults) {

        total += subjectResults[subject].hensachi;
        count++;

    }

    let avgHensachi = total / count;

    let uniKey = document.getElementById("university").value;

    let uni = universities[uniKey];

    let judge = "E";

    if (avgHensachi >= uni.border + 5) judge = "A";
    else if (avgHensachi >= uni.border) judge = "B";
    else if (avgHensachi >= uni.border - 5) judge = "C";
    else if (avgHensachi >= uni.border - 10) judge = "D";

    document.getElementById("judgeLetter").textContent = judge;

    document.getElementById("judgeUniversity").textContent = uni.name;

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

    loadYears();
    updateSheet();

    let saved = localStorage.getItem("subjectResults");

    if (saved) {

        subjectResults = JSON.parse(saved);

        updateReport();
        updateChart();
        updateJudge();

    }
    applyProfile();
    loadFriends();
}


document.getElementById("subject").addEventListener("change", () => {

    loadYears();
    updateSheet();

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
    subjectResults = {
        japanese: { score: 142, avg: 110, sd: 20, hensachi: 66.0 },
        englishR: { score: 78, avg: 61.8, sd: 15.4, hensachi: 60.5 },
        englishL: { score: 72, avg: 57.2, sd: 14.8, hensachi: 60.0 },
        math1A: { score: 65, avg: 48.5, sd: 16.2, hensachi: 60.2 },
        math2BC: { score: 68, avg: 51.3, sd: 15.9, hensachi: 60.5 }
    };

    updateReport();
    updateChart();
    updateJudge();
}

// --- タブ切り替え機能 ---
function switchTab(tabId) {
    // 全てのタブセクションを非表示にする
    let sections = document.querySelectorAll('.tab-section');
    sections.forEach(sec => sec.classList.remove('active'));

    // 全てのサイドバーメニューの選択状態を解除する
    let menus = document.querySelectorAll('.nav-menu li');
    menus.forEach(menu => menu.classList.remove('active'));

    // クリックされたタブセクションを表示する
    document.getElementById(tabId).classList.add('active');

    // クリックされたメニューをハイライトする
    let activeMenu = document.querySelector(`.nav-menu li[onclick="switchTab('${tabId}')"]`);
    if (activeMenu) {
        activeMenu.classList.add('active');
    }

    // Chart.jsは非表示の状態で更新されると描画がバグることがあるため、
    // 成績タブが開かれた瞬間にチャートのサイズをリサイズする
    if (tabId === 'tab-results' && radarChart) {
        radarChart.resize();
    }
}

// --- クラウド（Firebase）へ成績を保存する機能（全科目一括保存・上書き対応版） ---
async function saveScoreToCloud() {
    if (!window.db || !window.addDoc || !window.collection) return;

    // プロフィール情報を取得
    let profile = JSON.parse(localStorage.getItem("userProfile") || "{}");

    // プロフィールが未設定（IDがない）場合は保存させない
    if (!profile.userid) {
        alert("ランキングに参加するには、まず「設定」タブでユーザーIDとニックネームを保存してください！");
        return;
    }

    // 採点された成績データが全くない場合
    if (Object.keys(subjectResults).length === 0) {
        alert("まだ採点されていません！マークシートを入力して採点するか、デモ成績を表示させてください。");
        return;
    }

    let year = document.getElementById("year").value || "2022";
    const scoresRef = window.collection(window.db, "scores");

    try {
        // 1. データベースからすべての成績データを一度取得する
        const querySnapshot = await window.getDocs(scoresRef);

        // 2. 自分がすでに登録しているデータを科目ごとに整理する
        let existingDocs = {}; // { japanese: "docId", englishR: "docId" ... }
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            if (data.userid === profile.userid) {
                existingDocs[data.subject] = doc.id; // すでに存在する科目のドキュメントIDを記録
            }
        });

        // 3. 上書き対象の科目が1つでもあるかチェックする
        let hasExisting = false;
        for (let subject in subjectResults) {
            if (existingDocs[subject]) {
                hasExisting = true;
                break;
            }
        }

        // 4. 上書き対象があれば、1回だけ確認アラートを出す
        if (hasExisting) {
            let confirmUpdate = confirm("すでにいくつかの科目の成績が登録されています。\n最新の成績で上書き更新しますか？\n（過去の成績は上書きされてしまいます）");
            if (!confirmUpdate) {
                return; // キャンセルされた場合は処理を終了
            }
        }

        // 5. 画面に存在するすべての科目をループ処理で保存・更新する
        for (let subject in subjectResults) {
            let resultData = subjectResults[subject];
            let existingDocId = existingDocs[subject];

            if (existingDocId) {
                // すでにデータがある科目は「上書き（updateDoc）」
                const docRef = window.doc(window.db, "scores", existingDocId);
                await window.updateDoc(docRef, {
                    nickname: profile.nickname,
                    year: year,
                    score: resultData.score,
                    hensachi: resultData.hensachi,
                    prefecture: profile.prefecture || "",
                    school: profile.school || "",
                    grade: profile.grade || "",
                    updatedAt: new Date()
                });
            } else {
                // まだデータがない科目は「新規追加（addDoc）」
                await window.addDoc(scoresRef, {
                    userid: profile.userid,
                    nickname: profile.nickname,
                    subject: subject,
                    year: year,
                    score: resultData.score,
                    hensachi: resultData.hensachi,
                    prefecture: profile.prefecture || "",
                    school: profile.school || "",
                    grade: profile.grade || "",
                    createdAt: new Date()
                });
            }
        }

        alert(`${profile.nickname}さんのすべての科目の成績をクラウドに保存・更新しました！`);

    } catch (error) {
        console.error("保存エラー: ", error);
        alert("保存に失敗しました。");
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
    let userid = document.getElementById("profile-userid").value;
    let nickname = document.getElementById("profile-nickname").value;
    let university = document.getElementById("profile-university").value;
    let prefecture = document.getElementById("profile-prefecture").value;
    let school = document.getElementById("profile-school").value;
    let grade = document.getElementById("profile-grade").value;

    // ★ユーザーIDのチェック（空欄防止と、半角英数字のみかどうかの判定）
    if (userid.trim() === "") {
        alert("ユーザーIDを入力してください。");
        return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(userid)) {
        alert("ユーザーIDは半角のローマ字と数字のみで入力してください。\n（記号やスペース、日本語は使えません）");
        return;
    }

    if (nickname.trim() === "") {
        alert("ニックネームを入力してください。");
        return;
    }

    let profile = {
        userid: userid, // IDを保存データに追加
        nickname: nickname,
        university: university,
        prefecture: prefecture,
        school: school,
        grade: grade
    };

    localStorage.setItem("userProfile", JSON.stringify(profile));
    alert("プロフィールを保存しました！");
    applyProfile();
}

function applyProfile() {
    let savedProfile = localStorage.getItem("userProfile");

    if (savedProfile) {
        let profile = JSON.parse(savedProfile);

        // 1. 設定画面の入力を復元
        document.getElementById("profile-userid").value = profile.userid || "";
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

        // 3. ★ 新しいゲーム風プロフィール画面への反映 ★
        let displayNickname = document.getElementById("display-nickname");
        let displayUserid = document.getElementById("display-userid");
        let displayAvatar = document.getElementById("display-avatar");

        if (displayNickname) displayNickname.textContent = profile.nickname;
        if (displayUserid) displayUserid.textContent = profile.userid;

        // ユーザーIDを元に、DiceBear APIで固有のアバター画像を生成する
        if (displayAvatar && profile.userid) {
            displayAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.userid}`;
        }
    }
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