# imgfetch

GitHub Actions 當圖片搬運工: 把 `urls.txt` 列的公開圖片下載 (或對網頁做滾動截圖), 結果 commit 到 `out/<批次>/`, 供無法直接讀網路圖片的 Claude 工作階段用 `git pull` 取回。

- `urls.txt`: 一行一個; 直接圖片網址 → 下載; `shot https://...` → 以 1280x2000 視窗逐段截圖 (每段 2000 px, 最多 12 段), 並存頁內 >=300 px 的圖片網址到 `NN-imgs.txt`。
- 改 `urls.txt` 並 push 到 `imgfetch` 分支即觸發; 也可手動 workflow_dispatch。
- 結果: `out/<UTC 時間>/index.txt` 列出每行結果; webp/avif 會轉 png, 長邊 >2000 px 會縮小。
- 限制: 要登入的頁 (淘寶/天貓) 抓不到; 有防爬的站 (蝦皮) 可能空白。
