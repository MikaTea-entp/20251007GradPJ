# 🎓 Adeline – Art & DEsign LIfe NEtwork
**～生きづらさから、つくる力へ。～**

---

## 🧩 概要

**Adeline（アデリーン）** は、個人の「生きづらさ」や「困りごと」を出発点に、
**デザイン思考とAI支援によって自己変革・社会変革を促す学習プラットフォーム**です。

従来の支援や教育が「守る」ことに重点を置いてきたのに対し、
Adelineは「自分で課題を定義し、解決をデザインできる」エンパワメント型のアプローチを採用しています。

---

## 🎯 コンセプト

> **“Pain-Driven Design for Empowerment.”**
> ― 生きづらさを、創造の出発点に。

Adelineは「課題を抱えること」自体を否定せず、それを創造の原動力と捉えます。
ペインドリブンな体験を通して、ユーザーが自分自身の課題を再定義し、
「誰かのために何かをつくる」というポジティブな循環を生み出します。

---

## 🏗️ 主な機能

**ユーザー認証** Firebase Authenticationによるログイン／新規登録
**自己定義モジュール** 自身の課題・目標・想いを定義（Firestore保存）
**アイデア支援AI（Scamper Mode）** OpenAI APIによる発想補完・要約支援
**スタンプダイアリー** 毎日の行動・感情をスタンプ＋日記形式で記録
**プロポーザル管理（match.html）** 提出・共有可能な課題解決プランの閲覧／提出機能
**MBTI診断モジュール** ユーザーの思考特性を把握し、学び方を最適化

---

## ⚙️ 使用技術

* **Frontend:** HTML / CSS (Tailwind) / JavaScript
* **Backend:** Firebase (Auth / Firestore / Storage)
* **AI Integration:** OpenAI API (GPTモデル連携)
* **Hosting:** さくらレンタルサーバ
* **その他:** FileZilla / VS Code / GitHub / Figma

---

## 🔐 Firestore構成

```
/users/{userId}
/proposals/{proposalId}
/ideas/{ideaId}
/usernames/{uname}
```

### ✅ セキュリティルール

* 各ユーザーは自分のドキュメントのみ読み書き可能
* 公開usernamesはreadのみ許可
* 複合クエリ（`where + orderBy`）には専用インデックスを設定済み

---

## 💬 制作を通しての学び

この制作を通して、
「正解を探す」ことよりも「問いを立てる」ことの大切さを実感しました。
技術の習得を超えて、**“自分をどうデザインするか”** という課題に向き合えた期間でした。

AdelineはまだMVP段階ですが、これを起点に、
“つくることで生きる力を取り戻す社会”を実現していきたいと思います。

---

## 📚 今後の展望

* React / Next.js への移行によるUX強化
* チーム／企業アカウント対応（Adeline for Companies）
* 支援者・教育機関との連携（Adeline for Students）
* データ可視化／AIパーソナルフィードバック機能追加

---

## 👨‍💻 作者

**美香紅茶（GitHub: MikaTea_entp）**

* G’s Academy TOKYO DEV Course
* 経済学修士 / コンサルタント
* Vision: 「Empowerment × Design × Technology」で社会を変える。

---

## 🏁 メッセージ

> コードは完成するためにあるんじゃない。
> **誰かを動かすために書かれる。**
