import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Firebase設定
// ★githubアップ時に忘れず消すこと！★
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

class DiaryApp {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.currentUser = null;
        this.today = new Date();
        this.loadYear = this.today.getFullYear();
        this.loadMonth = this.today.getMonth();
        this.targetSlot = null;
        this.idleTimer = null;
        this.IDLE_TIMEOUT = 1000 * 60 * 10; // 10分
        
        // スタンプキャッシュとテキストキャッシュを追加
        this.stampCache = new Map();
        this.textCache = new Map();
        
        this.stampSections = [
            {
                title: "感情",
                emojis: ["😀","😭","😡","😍","🤔","😴","🤯","🥳","😅","🤗","🤩","😱","🤤","🥺","🥶","🥵"]
            },
            {
                title: "学習・仕事",
                emojis: ["📚","📖","📝","💻","💯","💤","🖊","📊","📡","📰","🌐","🔬","🔭","⚛️","🔢","➗","🧮","🧪","🎓"]
            },
            {
                title: "ヘルスケア",
                emojis: ["💊","🏥","🚭","🥗","🚶‍♀️","🏃‍♂️","🛌","🤒","🤧","🤕","🧘","💪","🩺"]
            },
            {
                title: "家事・生活",
                emojis: ["🗑","🧺","🧹","🛒","🍳","🧽","💸","📦","🪴","🚪","🛠","🧯"]
            },
            {
                title: "余暇",
                emojis: ["🎬","🎮","🎵","📷","🛝","🎨","🎤","✈️"]
            },
            {
                title: "食事",
                emojis: ["🍛","🍣","🍕","🍔","🍩","🍜","🥟","🫖"]
            }
        ];

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.buildPalette();
            this.setupIdleDetection();
        
            // 認証状態の監視
            onAuthStateChanged(this.auth, this.handleAuthStateChange.bind(this));
        } catch (error) {
            this.showError('アプリケーションの初期化に失敗しました: ' + error.message);
        }
    }

    async handleAuthStateChange(user) {
        try {
            if (!user) {
                await signInAnonymously(this.auth);
                return;
            }
        
            this.currentUser = user;
            await this.renderCalendar(this.today.getFullYear(), this.today.getMonth());
            this.hideLoading();
        } catch (error) {
            this.showError('認証エラー: ' + error.message);
        }
    }

    setupEventListeners() {
        // 今月に戻るボタン
        document.getElementById("toThisMonth").addEventListener("click", () => {
            this.resetToCurrentMonth();
        });

        // 前月・翌月ナビゲーション
        document.getElementById("prevMonth").addEventListener("click", () => {
            this.navigateMonth(-1);
        });

        document.getElementById("nextMonth").addEventListener("click", () => {
            this.navigateMonth(1);
        });

        // パレット外クリックで閉じる
        document.addEventListener("click", (e) => {
            const palette = document.getElementById("stampPalette");
            if (palette.style.display === "block" && !palette.contains(e.target)) {
                this.hidePalette();
            }
        });
    }

    setupIdleDetection() {
        const resetTimer = () => {
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(async () => {
                try {
                    await signOut(this.auth);
                    alert("10分間操作がなかったため自動ログアウトされました。");
                    location.href = "../auth/auth.html";
                } catch (error) {
                console.error("ログアウトエラー:", error);
                }
            }, this.IDLE_TIMEOUT);
        };

        ["mousemove", "keydown", "click", "scroll"].forEach(evt => {
            document.addEventListener(evt, resetTimer, false);
        });

        resetTimer();
    }

    // 日付IDの生成(テキスト用)
    ymdTextId(year, month, day) {
        const mm = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
    }

    // 日付IDの生成(スタンプ用)
    ymdId(year, month, day, position) {
        const mm = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return `${year}-${mm}-${dd}_${position}`;
    }

    monthTitle(year, month) {
        return `${year}年${month + 1}月`;
    }

    // 月のキー生成
    getMonthKey(year, month) {
        return `${year}-${String(month + 1).padStart(2, "0")}`;
    }

    buildPalette() {
        const palette = document.getElementById("stampPalette");
        palette.innerHTML = "";

        const closeBtn = document.createElement("span");
        closeBtn.className = "close-btn";
        closeBtn.textContent = "× スタンプ削除/閉じる";
        closeBtn.addEventListener("click", async () => {
            if (this.targetSlot && this.targetSlot.textContent.trim()) {
                // スタンプが押されている場合は削除
                const id = this.targetSlot.dataset.id;
                this.targetSlot.textContent = "";
                await this.saveStamp(id, "");
            }
            this.hidePalette();
        });
        palette.appendChild(closeBtn);
        
        palette.appendChild(document.createElement("hr"));

        this.stampSections.forEach(section => {
            const titleDiv = document.createElement("div");
            titleDiv.className = "section-title";
            titleDiv.textContent = section.title;
            palette.appendChild(titleDiv);

        section.emojis.forEach(emoji => {
            const span = document.createElement("span");
            span.className = "emoji";
            span.textContent = emoji;
            span.addEventListener("click", async () => {
                await this.selectStamp(emoji);
            });
            palette.appendChild(span);
        });

            palette.appendChild(document.createElement("hr"));
        });
    }

    async selectStamp(emoji) {
        if (!this.targetSlot) return;
        
        try {
            const id = this.targetSlot.dataset.id;
            this.targetSlot.textContent = emoji;
            
            // キャッシュも更新
            this.stampCache.set(id, emoji);
            
            await this.saveStamp(id, emoji);
            this.hidePalette();
        } catch (error) {
            this.showError('スタンプの保存に失敗しました: ' + error.message);
        }
    }

    showPalette(x, y, slotElement) {
        this.targetSlot = slotElement;
        const palette = document.getElementById("stampPalette");
        
        // 画面外に出ないよう位置調整
        const maxX = window.innerWidth - palette.offsetWidth - 20;
        const maxY = window.innerHeight - palette.offsetHeight - 20;
        
        palette.style.left = Math.min(x, maxX) + "px";
        palette.style.top = Math.min(y, maxY) + "px";
        palette.style.display = "block";
    }

    hidePalette() {
        document.getElementById("stampPalette").style.display = "none";
        this.targetSlot = null;
    }

    // 最適化: 月単位でスタンプとテキストを一括読み込み
    async loadStampsForMonth(year, month, lastDay) {
        if (!this.currentUser) return;

        const monthKey = this.getMonthKey(year, month);
        
        // キャッシュから取得を試行
        if (this.stampCache.has(monthKey) && this.textCache.has(monthKey)) {
            const cachedStamps = this.stampCache.get(monthKey);
            const cachedTexts = this.textCache.get(monthKey);
            this.applyStampsToCalendar(cachedStamps);
            this.applyTextsToCalendar(cachedTexts);
            return;
        }

        try {
            // スタンプとテキストを並行して読み込み
            await Promise.all([
                this.loadMonthStamps(year, month, lastDay, monthKey),
                this.loadMonthTexts(year, month, lastDay, monthKey)
            ]);
            
        } catch (error) {
            console.error("月間データ読み込みエラー:", error);
            
            // フォールバック: 個別読み込み
            await this.loadStampsIndividually(year, month, lastDay);
        }
    }

    // 月間スタンプ読み込み
    async loadMonthStamps(year, month, lastDay, monthKey) {
        const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        
        const stampsRef = collection(this.db, "users", this.currentUser.uid, "stamps");
        const q = query(
            stampsRef,
            where("stampId", ">=", `${startDate}_bl`),
            where("stampId", "<=", `${endDate}_tr\uf8ff`)
        );
        
        const querySnapshot = await getDocs(q);
        const monthStamps = {};
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            monthStamps[doc.id] = data.emoji || "";
        });

        // キャッシュに保存
        this.stampCache.set(monthKey, monthStamps);
        
        // カレンダーに適用
        this.applyStampsToCalendar(monthStamps);
        
        console.log(`月間スタンプ読み込み完了: ${querySnapshot.size}個のスタンプ`);
    }

    // 月間テキスト読み込み
    async loadMonthTexts(year, month, lastDay, monthKey) {
        const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        
        const textsRef = collection(this.db, "users", this.currentUser.uid, "diaryTexts");
        const q = query(
            textsRef,
            where("textId", ">=", startDate),
            where("textId", "<=", endDate)
        );
        
        const querySnapshot = await getDocs(q);
        const monthTexts = {};
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            monthTexts[doc.id] = data.text || "";
        });

        // キャッシュに保存
        this.textCache.set(monthKey, monthTexts);
        
        // カレンダーに適用
        this.applyTextsToCalendar(monthTexts);
        
        console.log(`月間テキスト読み込み完了: ${querySnapshot.size}個のテキスト`);
    }

    // カレンダーにスタンプを適用
    applyStampsToCalendar(stamps) {
        const tbody = document.getElementById("calendarBody");
        
        Object.entries(stamps).forEach(([stampId, emoji]) => {
            if (!emoji) return;
            
            const [datePart, position] = stampId.split('_');
            const slot = tbody.querySelector(`.slot.${position}[data-id="${stampId}"]`);
            
            if (slot) {
                slot.textContent = emoji;
            }
        });
    }

    // カレンダーにテキストを適用
    applyTextsToCalendar(texts) {
        const tbody = document.getElementById("calendarBody");
        
        Object.entries(texts).forEach(([textId, text]) => {
            if (!text) return;
            
            const textarea = tbody.querySelector(`textarea[data-text-id="${textId}"]`);
            
            if (textarea) {
                textarea.value = text;
                this.updateCharCount(textarea);
            }
        });
    }

    // フォールバック: 個別読み込み（従来の方法）
    async loadStampsIndividually(year, month, lastDay) {
        console.log("フォールバック: 個別スタンプ読み込み開始");
        
        const tbody = document.getElementById("calendarBody");
        
        for (let day = 1; day <= lastDay; day++) {
            for (const position of ["tr", "bl", "br"]) {
                const id = this.ymdId(year, month, day, position);
                const slot = tbody.querySelector(`.slot.${position}[data-id="${id}"]`);
                
                if (slot) {
                    try {
                        const emoji = await this.loadStamp(id);
                        slot.textContent = emoji;
                    } catch (error) {
                        console.error(`スタンプ読み込みエラー (${id}):`, error);
                    }
                }
            }
        }
    }

    async loadStamp(id) {
        if (!this.currentUser) return "";
        
        try {
            const ref = doc(this.db, "users", this.currentUser.uid, "stamps", id);
            const snap = await getDoc(ref);
            return snap.exists() ? (snap.data().emoji || "") : "";
        } catch (error) {
            console.error("スタンプ読み込みエラー:", error);
            return "";
        }
    }

    async saveStamp(id, emoji) {
        if (!this.currentUser) {
            throw new Error("ユーザーが認証されていません");
        }
        
        try {
            const ref = doc(this.db, "users", this.currentUser.uid, "stamps", id);
            await setDoc(ref, { 
                emoji, 
                updatedAt: new Date(),
                userId: this.currentUser.uid,
                stampId: id
            }, { merge: true });

            // キャッシュも更新
            const monthKey = this.getMonthKey(this.loadYear, this.loadMonth);
            if (this.stampCache.has(monthKey)) {
                const monthStamps = this.stampCache.get(monthKey);
                monthStamps[id] = emoji;
            }
        
            console.log(`スタンプ保存成功: ${id} -> ${emoji}`);
        } catch (error) {
            console.error("スタンプ保存エラー:", error);
            throw new Error("スタンプの保存に失敗しました: " + error.message);
        }
    }

    async saveText(id, text) {
        if (!this.currentUser) {
            throw new Error("ユーザーが認証されていません");
        }
        
        try {
            const ref = doc(this.db, "users", this.currentUser.uid, "diaryTexts", id);
            await setDoc(ref, { 
                text, 
                updatedAt: new Date(),
                userId: this.currentUser.uid,
                textId: id
            }, { merge: true });

            // キャッシュも更新
            const monthKey = this.getMonthKey(this.loadYear, this.loadMonth);
            if (this.textCache.has(monthKey)) {
                const monthTexts = this.textCache.get(monthKey);
                monthTexts[id] = text;
            }
        
            console.log(`テキスト保存成功: ${id} -> ${text.substring(0, 20)}...`);
        } catch (error) {
            console.error("テキスト保存エラー:", error);
            throw new Error("日記テキストの保存に失敗しました: " + error.message);
        }
    }

    // 文字数カウント更新
    updateCharCount(textarea) {
        const charCount = textarea.parentElement.querySelector('.char-count');
        if (charCount) {
            const currentLength = textarea.value.length;
            charCount.textContent = `${currentLength}/140`;
            
            if (currentLength > 140) {
                charCount.style.color = '#e53e3e';
                textarea.value = textarea.value.substring(0, 140);
                charCount.textContent = '140/140';
            } else if (currentLength > 120) {
                charCount.style.color = '#f56500';
            } else {
                charCount.style.color = '#718096';
            }
        }
    }

    async renderCalendar(year, month) {
        const tbody = document.getElementById("calendarBody");
        
        // 月タイトル行
        const titleTr = document.createElement("tr");
        const th = document.createElement("th");
        th.colSpan = 7;
        th.className = "month-title";
        th.textContent = this.monthTitle(year, month);
        titleTr.appendChild(th);
        tbody.appendChild(titleTr);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0).getDate();
        let weekday = firstDay.getDay();
        let tr = document.createElement("tr");

        // 月初の空セル
        for (let i = 0; i < weekday; i++) {
            tr.appendChild(document.createElement("td"));
        }

        // 日付セル
        for (let day = 1; day <= lastDay; day++) {
            if (weekday === 7) {
                tbody.appendChild(tr);
                tr = document.createElement("tr");
                weekday = 0;
            }

            const td = document.createElement("td");
            const cell = this.createDayCell(year, month, day);
            td.appendChild(cell);
            tr.appendChild(td);
            weekday++;
        }

        // 月末の空セル
        if (weekday > 0) {
            for (let i = weekday; i < 7; i++) {
                tr.appendChild(document.createElement("td"));
            }
            tbody.appendChild(tr);
        }

        // スタンプ復元（最適化版）
        await this.loadStampsForMonth(year, month, lastDay);
    }

    createDayCell(year, month, day) {
        const cell = document.createElement("div");
        cell.className = "cell";

        // 上部：日付とスタンプエリア
        const topArea = document.createElement("div");
        topArea.className = "top-area";

        const dateDiv = document.createElement("div");
        dateDiv.className = "date";
        dateDiv.textContent = day;
        topArea.appendChild(dateDiv);

        // スタンプスロット
        ["tr", "bl", "br"].forEach(position => {
            const slot = document.createElement("div");
            slot.className = `slot ${position}`;
            slot.dataset.id = this.ymdId(year, month, day, position);
            
            slot.addEventListener("click", (event) => {
                event.stopPropagation();
                const rect = slot.getBoundingClientRect();
                this.showPalette(
                    rect.left + rect.width / 2,
                    rect.top + window.scrollY + rect.height + 8,
                    slot
                );
            });
            topArea.appendChild(slot);
        });

        cell.appendChild(topArea);

        // 下部：テキストエリア
        const textContainer = document.createElement("div");
        textContainer.className = "text-container";

        const textarea = document.createElement("textarea");
        textarea.className = "diary-text";
        textarea.placeholder = "今日の一言...";
        textarea.maxLength = 140;
        textarea.dataset.textId = this.ymdTextId(year, month, day);
        
        let saveTimeout;
        textarea.addEventListener("input", () => {
            this.updateCharCount(textarea);
            
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                const textId = textarea.dataset.textId;
                const text = textarea.value;
                try {
                    await this.saveText(textId, text);
                } catch (error) {
                    console.error("テキスト自動保存エラー:", error);
                }
            }, 1000);
        });

        const charCount = document.createElement("div");
        charCount.className = "char-count";
        charCount.textContent = "0/140";

        textContainer.appendChild(textarea);
        textContainer.appendChild(charCount);
        cell.appendChild(textContainer);

        return cell;
    }

    navigateMonth(direction) {
        this.loadMonth += direction;
        if (this.loadMonth > 11) {
            this.loadMonth = 0;
            this.loadYear++;
        } else if (this.loadMonth < 0) {
            this.loadMonth = 11;
            this.loadYear--;
        }
        
        // カレンダーを完全に再描画
        document.getElementById("calendarBody").innerHTML = "";
        this.renderCalendar(this.loadYear, this.loadMonth);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetToCurrentMonth() {
        document.getElementById("calendarBody").innerHTML = "";
        this.loadYear = this.today.getFullYear();
        this.loadMonth = this.today.getMonth();
        this.renderCalendar(this.loadYear, this.loadMonth);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showError(message) {
        const errorElement = document.getElementById("errorMessage");
        errorElement.textContent = message;
        errorElement.style.display = "block";
        this.hideLoading();
    }

    hideLoading() {
        document.getElementById("loadingIndicator").style.display = "none";
        document.getElementById("calendar").style.display = "table";
    }
}

// ⏳ アイドル検出
let idleTimer;
const IDLE_TIMEOUT = 1000 * 60 * 10;

const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
        await signOut(auth);
        alert("10分間操作がなかったため自動ログアウトされました。");
        location.href = "https://mikatea.sakura.ne.jp/Adeline/index/index.html";
    }, IDLE_TIMEOUT);
};

// アプリケーション開始
new DiaryApp();