let requestId = null;
let ppi = 96;
let DD = 30;
let factor = 1;
let scrollMeters = 0;
let lastPosition = 0;

function debounce(func, delay) {
    let timeoutId;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

// CSSピクセルを物理ピクセルにしてからメートルに変換する
function pixelsToMeters(pixels) {
    const inches = (pixels * window.devicePixelRatio) / ppi;
    return inches * 0.0254;
}

// 読み込む
async function loadSettings() {
    const data = await chrome.storage.local.get(['devicePPI', 'debounceDelay', 'factor', 'scrollMeters']);
    ppi = data.devicePPI || 96;
    DD = data.debounceDelay || 30;
    factor = data.factor || 1;
    scrollMeters = data.scrollMeters || 0;

    if (ppi == 0) {
        alert('PPIが0に設定されています。再設定してください。')
        chrome.tabs.create({ url: "setting.html" });
    } else {
        console.log(`Loaded settings: PPI=${ppi}, debounceDelay=${DD}, factor=${factor}, scrollMeters=${scrollMeters}`);
    }
}

// スクロール距離の保存
async function saveScrollMeters() {
    try {
        await chrome.storage.local.set({ scrollMeters });
        console.log(`Scroll distance saved: ${scrollMeters} meters`);
    } catch (error) {
        console.error('Failed to save scroll distance:', error);
    }
}

// スクロール距離の更新
async function updateScrollDistance() {
    const currentPosition = window.scrollY;
    const delta = Math.abs(currentPosition - lastPosition) * factor;
    scrollMeters += pixelsToMeters(delta);
    lastPosition = currentPosition;

    await saveScrollMeters();

    // popup.jsへ
    chrome.runtime.sendMessage({ scrollMeters: scrollMeters })
        .catch(e => {
        });
    requestId = null;
}

function handleScroll() {
    if (!requestId) {
        requestId = requestAnimationFrame(updateScrollDistance);
    }
}

// URLの変更を検知
function monitorUrlChanges() {
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            // DOMの変更を監視
            new MutationObserver((mutations, observer) => {
                if (document.readyState === 'complete') {
                    lastPosition = window.scrollY;
                    console.log(`DOM変更検知 lp:${lastPosition}`);
                    observer.disconnect();
                }
            }).observe(document, { childList: true, subtree: true });
        }
    }).observe(document, { subtree: true, childList: true });
}



(async function () {
    console.log(`Device pixel ratio: ${window.devicePixelRatio}`);
    lastPosition = window.scrollY;

    await loadSettings();

    window.addEventListener('scroll', debounce(handleScroll, DD));

    monitorUrlChanges();
})();
