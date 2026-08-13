// ==========================================
// STATE MANAGEMENT
// ==========================================
let originalArray = [];
let array = [];
let arraySize = 44;
let delay = 50; // default medium speed
let isSorting = false;
let isPaused = false;
let shouldStop = false;
let currentRunId = 0;
let sleepResolve = null;
let sleepTimeout = null;

// Statistics
let comps = 0;
let swaps = 0;
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;

// Algorithm Complexities
const complexities = {
    'Bubble Sort': { best: 'O(N)', avg: 'O(N²)', worst: 'O(N²)', space: 'O(1)' },
    'Selection Sort': { best: 'O(N²)', avg: 'O(N²)', worst: 'O(N²)', space: 'O(1)' },
    'Insertion Sort': { best: 'O(N)', avg: 'O(N²)', worst: 'O(N²)', space: 'O(1)' },
    'Merge Sort': { best: 'O(N log N)', avg: 'O(N log N)', worst: 'O(N log N)', space: 'O(N)' },
    'Quick Sort': { best: 'O(N log N)', avg: 'O(N log N)', worst: 'O(N²)', space: 'O(log N)' },
    'Radix Sort': { best: 'O(N * K)', avg: 'O(N * K)', worst: 'O(N * K)', space: 'O(N + K)' }
};

let currentAlgorithm = 'Bubble Sort';

// ==========================================
// DOM ELEMENTS
// ==========================================
const visualizationPanel = document.getElementById('visualization-panel');

// Controls
const sizeSlider = document.getElementById('size-slider');
const sizeValue = document.getElementById('size-value');
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
const customArrayInput = document.getElementById('custom-array-input');
const loadBtn = document.getElementById('load-btn');

// Buttons
const randomizeBtn = document.getElementById('randomize-btn');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');

// Status Panel
const statusAlgorithm = document.getElementById('status-algorithm');
const statusState = document.getElementById('status-state');
const statSize = document.getElementById('stat-size');
const statComparisons = document.getElementById('stat-comparisons');
const statSwaps = document.getElementById('stat-swaps');
const statTime = document.getElementById('stat-time');

// Complexity
const compTimeBest = document.getElementById('comp-time-best');
const compTimeAvg = document.getElementById('comp-time-avg');
const compTimeWorst = document.getElementById('comp-time-worst');
const compSpace = document.getElementById('comp-space');

// Dropdown
const trigger = document.getElementById('dropdown-trigger');
const template = document.getElementById('dropdown-menu-template');
const selectedAlgoText = document.getElementById('selected-algo-text');
const triggerIcon = document.querySelector('.trigger-icon');

let dropdownMenu = null;
let isDropdownOpen = false;

// ==========================================
// SOUND SYSTEM
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let masterGainNode = null;
let soundEnabled = true;
let volume = 0.4; // Reverted base volume for desktop/laptop comfort

const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundIcon = document.getElementById('sound-icon');
const soundText = document.getElementById('sound-text');

const savedSound = sessionStorage.getItem('neosort-sound');
if (savedSound === 'off') {
    soundEnabled = false;
}

function updateSoundUI() {
    if (!soundToggleBtn) return;
    const svgIcon = document.getElementById('sound-icon-svg');
    if (soundEnabled) {
        if (svgIcon) {
            svgIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>`;
        }
        soundText.textContent = 'ON';
        soundToggleBtn.style.color = 'var(--cyan)';
        soundToggleBtn.style.borderColor = 'var(--cyan)';
        soundToggleBtn.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.3)';
    } else {
        if (svgIcon) {
            svgIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="1" x2="1" y2="23"></line>`;
        }
        soundText.textContent = 'OFF';
        soundToggleBtn.style.color = 'var(--text-muted)';
        soundToggleBtn.style.borderColor = 'var(--panel-border)';
        soundToggleBtn.style.boxShadow = 'none';
    }
}

function updateSoundPosition() {
    if (!soundToggleBtn) return;
    const mobileContainer = document.getElementById('sound-area');
    const desktopContainer = document.getElementById('system-status-title-row');

    if (window.innerWidth <= 768) {
        if (soundToggleBtn.parentElement !== mobileContainer && mobileContainer) {
            mobileContainer.appendChild(soundToggleBtn);
        }
    } else {
        if (soundToggleBtn.parentElement !== desktopContainer && desktopContainer) {
            desktopContainer.appendChild(soundToggleBtn);
        }
    }
}

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

function updateMasterGain() {
    if (!masterGainNode || !audioCtx) return;

    const device = getDeviceType();
    let finalGain = 1.0;

    // Proper Output Calibration:
    // Max pre-master peak is playStartSound (volume 0.4 * multiplier 0.4 = 0.16 amplitude).
    // To strictly prevent digital clipping (amplitude > 1.0) on small speakers, 
    // the absolute max safe gain multiplier is 1.0 / 0.16 = 6.25x.
    if (device === 'mobile') {
        finalGain = 6.0; // Mathematically safe limit for maximum clean acoustic volume on phones
    } else if (device === 'tablet') {
        finalGain = 3.0; // Balanced intermediate gain for tablets
    } else {
        finalGain = 1.0; // Standard reference output for desktop/laptop
    }

    masterGainNode.gain.setTargetAtTime(finalGain, audioCtx.currentTime, 0.1);
}

function initAudio() {
    if (!soundEnabled) return;
    if (!audioCtx) {
        audioCtx = new AudioContext();
        masterGainNode = audioCtx.createGain();
        masterGainNode.connect(audioCtx.destination);
        updateMasterGain();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Sound Generators
function playTone(freq, type, duration, volMultiplier = 1) {
    if (!soundEnabled || !audioCtx || !masterGainNode) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * volMultiplier, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(masterGainNode);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playStartSound() {
    initAudio();
    playTone(440, 'sine', 0.1, 0.4);
    setTimeout(() => playTone(880, 'sine', 0.2, 0.4), 100);
}

function playStopSound() {
    if (!soundEnabled || !audioCtx || !masterGainNode) return;
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume * 0.38, now + 0.03); // smooth attack, slightly softer
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // smooth release

    osc.connect(gainNode);
    gainNode.connect(masterGainNode);

    osc.start(now);
    osc.stop(now + 0.2);
}

function playRestartSound() {
    initAudio();
    playTone(600, 'triangle', 0.1, 0.3);
    setTimeout(() => playTone(400, 'triangle', 0.15, 0.3), 80);
}

function playSelectSound() {
    initAudio();
    playTone(1200, 'sine', 0.1, 0.2);
}

function playLoadSound() {
    initAudio();
    playTone(800, 'sine', 0.1, 0.3);
    setTimeout(() => playTone(1200, 'sine', 0.15, 0.3), 100);
}

function playRandomizeSound() {
    initAudio();
    if (!soundEnabled || !audioCtx) return;
    for (let i = 0; i < 4; i++) {
        setTimeout(() => playTone(400 + Math.random() * 400, 'sine', 0.05, 0.15), i * 40);
    }
}

let lastCompareTime = 0;
function playCompareSound() {
    if (!soundEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const throttleTime = delay < 20 ? 0.04 : 0.015;
    if (now - lastCompareTime < throttleTime) return;
    lastCompareTime = now;

    playTone(800, 'sine', 0.03, 0.1);
}

let lastSwapTime = 0;
function playSwapSound() {
    if (!soundEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const throttleTime = delay < 20 ? 0.05 : 0.02;
    if (now - lastSwapTime < throttleTime) return;
    lastSwapTime = now;

    playTone(500, 'triangle', 0.05, 0.15);
}

let lastSortedTime = 0;
function playSortedSound(index, total) {
    if (!soundEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const throttleTime = delay < 10 ? 0.02 : 0.005;
    if (now - lastSortedTime < throttleTime) return;
    lastSortedTime = now;

    const minFreq = 400;
    const maxFreq = 1200;
    const freq = minFreq + (index / total) * (maxFreq - minFreq);
    playTone(freq, 'sine', 0.05, 0.15);
}

function playCompleteSound() {
    if (!soundEnabled || !audioCtx) return;
    setTimeout(() => playTone(440, 'sine', 0.2, 0.3), 0);
    setTimeout(() => playTone(554, 'sine', 0.2, 0.3), 150);
    setTimeout(() => playTone(659, 'sine', 0.4, 0.3), 300);
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    updateSoundUI();
    updateSoundPosition();
    setupDropdown();
    setupEventListeners();
    updateSpeedText(speedSlider.value);
    updateComplexity(currentAlgorithm);
    generateArray();
    resetStats();
}

// ==========================================
// DROPDOWN LOGIC
// ==========================================
let focusedIndex = -1;

function setupDropdown() {
    // Append to body to ensure it is above everything
    const clone = template.content.cloneNode(true);
    document.body.appendChild(clone);
    dropdownMenu = document.getElementById('dropdown-menu');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDropdownOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    dropdownMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (item) {
            if (isSorting && !isPaused) return; // Prevent changing while running

            playSelectSound();
            // Update active state
            document.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // Update Trigger
            const algoName = item.getAttribute('data-algo');
            const colorName = item.getAttribute('data-color');

            currentAlgorithm = algoName;
            selectedAlgoText.textContent = algoName;
            triggerIcon.style.color = `var(--${colorName})`;

            statusAlgorithm.textContent = algoName;

            updateComplexity(algoName);
            closeDropdown();
        }
    });

    document.addEventListener('click', (e) => {
        if (isDropdownOpen && !dropdownMenu.contains(e.target) && !trigger.contains(e.target)) {
            closeDropdown();
        }
    });

    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!isDropdownOpen) return;

        const items = Array.from(dropdownMenu.querySelectorAll('.dropdown-item'));
        if (items.length === 0) return;

        if (e.key === 'Escape') {
            closeDropdown();
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusedIndex = (focusedIndex + 1) % items.length;
            updateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusedIndex = (focusedIndex - 1 + items.length) % items.length;
            updateFocus(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < items.length) {
                items[focusedIndex].click();
            }
        }
    });
}

function updateFocus(items) {
    items.forEach((item, index) => {
        const text = item.querySelector('.item-text');
        if (index === focusedIndex) {
            item.style.background = 'rgba(255, 255, 255, 0.05)';
            item.style.paddingLeft = '1.2rem';
            if (text) {
                text.style.color = '#fff';
                text.style.textShadow = '0 0 5px rgba(255,255,255,0.3)';
            }
        } else {
            item.style.background = '';
            item.style.paddingLeft = '';
            if (text) {
                text.style.color = '';
                text.style.textShadow = '';
            }
        }
    });
}

function openDropdown() {
    if (isSorting && !isPaused) return;
    isDropdownOpen = true; // Set this to true BEFORE updateDropdownPosition
    updateDropdownPosition();
    dropdownMenu.classList.add('active');
    trigger.querySelector('.trigger-arrow').style.transform = 'rotate(180deg)';

    const items = Array.from(dropdownMenu.querySelectorAll('.dropdown-item'));
    focusedIndex = items.findIndex(item => item.classList.contains('active'));
    updateFocus(items);
}

function closeDropdown() {
    dropdownMenu.classList.remove('active');
    trigger.querySelector('.trigger-arrow').style.transform = 'rotate(0deg)';
    isDropdownOpen = false;

    const items = Array.from(dropdownMenu.querySelectorAll('.dropdown-item'));
    focusedIndex = -1;
    updateFocus(items);
}

function updateDropdownPosition() {
    if (!dropdownMenu || !isDropdownOpen) return;
    const rect = trigger.getBoundingClientRect();
    dropdownMenu.style.top = `${rect.bottom + 5}px`;

    // Ensure dropdown stays in viewport
    let leftPos = rect.left;
    if (leftPos + rect.width > window.innerWidth) {
        leftPos = window.innerWidth - rect.width - 10;
    }
    if (leftPos < 10) leftPos = 10;

    dropdownMenu.style.left = `${leftPos}px`;
    dropdownMenu.style.width = `${rect.width}px`;
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    window.addEventListener('resize', () => {
        updateBarPositions();
        updateSoundPosition();
        updateMasterGain();
    });

    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            sessionStorage.setItem('neosort-sound', soundEnabled ? 'on' : 'off');
            updateSoundUI();
            if (soundEnabled) {
                initAudio();
                playTone(800, 'sine', 0.1, 0.3); // feedback
            }
        });
    }

    sizeSlider.addEventListener('input', (e) => {
        if (isSorting) return;
        arraySize = parseInt(e.target.value);
        sizeValue.textContent = arraySize;
        statSize.textContent = arraySize;
        generateArray();
        resetStats();
    });

    speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        updateSpeedText(val);
    });

    randomizeBtn.addEventListener('click', () => {
        if (isSorting && !isPaused) return;
        playRandomizeSound();
        if (isSorting && isPaused) {
            cancelCurrentRun();
        }
        generateArray();
        resetStats();
        updateButtonsState();
    });

    loadBtn.addEventListener('click', () => {
        handleArrayAction();
    });

    customArrayInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleArrayAction();
        }
    });

    startBtn.addEventListener('click', () => {
        if (isSorting && !isPaused) return;

        playStartSound();
        if (isPaused) {
            // Resume
            isPaused = false;
            statusState.textContent = 'Sorting...';
            updateButtonsState();
            startTimer();
        } else {
            // Start fresh
            currentRunId++;
            isSorting = true;
            isPaused = false;
            shouldStop = false;
            array = [...originalArray];
            renderArray();
            resetStats();
            statusState.textContent = 'Sorting...';
            updateButtonsState();
            startTimer();
            startAlgorithm(currentRunId);
        }
    });

    pauseBtn.addEventListener('click', () => {
        playRestartSound();
        cancelCurrentRun();

        // RESET BEHAVIOR
        array = [...originalArray];
        renderArray();
        resetStats();
        updateButtonsState();
    });

    stopBtn.addEventListener('click', () => {
        if (isSorting && !isPaused) {
            playStopSound();
            isPaused = true;
            statusState.textContent = 'Paused';
            updateButtonsState();
            stopTimer();
        }
    });
}

// ==========================================
// ARRAY OPERATIONS
// ==========================================
function generateArray() {
    originalArray = [];
    for (let i = 0; i < arraySize; i++) {
        originalArray.push(Math.floor(Math.random() * 100) + 1);
    }
    array = [...originalArray];
    renderArray();
}

function handleArrayAction() {
    const inputStr = customArrayInput.value;
    const arr = inputStr.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x > 0);

    if (arr.length === 0) {
        alert("Invalid input. Please enter a comma-separated list of positive numbers.");
        return;
    }
    if (arr.length > 200) {
        alert("Maximum array size is 200.");
        return;
    }

    let isSame = false;
    if (arr.length === originalArray.length) {
        isSame = true;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== originalArray[i]) {
                isSame = false;
                break;
            }
        }
    }

    if (isSorting) {
        cancelCurrentRun();
    }

    if (!isSame) {
        originalArray = arr;
        array = [...originalArray];
        arraySize = array.length;
        sizeSlider.value = arraySize;
        sizeValue.textContent = arraySize;
        statSize.textContent = arraySize;
    } else {
        array = [...originalArray];
    }

    playLoadSound();
    resetStats();
    renderArray();
}

function renderArray() {
    visualizationPanel.innerHTML = '';

    // Create an inner wrapper that fills the available content area (inside padding)
    const wrapper = document.createElement('div');
    wrapper.id = 'bars-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.flex = '1';
    wrapper.style.alignSelf = 'stretch';
    visualizationPanel.appendChild(wrapper);

    array.forEach((val, i) => {
        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.id = `bar-${i}`;

        // Force absolute positioning inline to bypass any flexbox issues
        bar.style.position = 'absolute';
        bar.style.bottom = '0';
        bar.style.left = '0';

        wrapper.appendChild(bar);
    });

    updateBarPositions();
}

function updateBarPositions() {
    if (array.length === 0) return;
    const wrapper = document.getElementById('bars-wrapper');
    if (!wrapper) return;

    const panelWidth = wrapper.clientWidth;
    const panelHeight = wrapper.clientHeight > 0 ? wrapper.clientHeight : 250;

    // Dynamic gap calculation to ensure they fit
    let gap = 2;
    if (array.length > 50) gap = 1;
    if (array.length > 100) gap = 0; // Prevent gap from eating all space

    const totalGaps = Math.max(0, array.length - 1);
    let barWidth = (panelWidth - (totalGaps * gap)) / array.length;

    // Fallback if container is too small
    if (barWidth < 0.5) {
        gap = 0;
        barWidth = panelWidth / array.length;
    }

    const maxVal = Math.max(...array, 1);

    array.forEach((val, i) => {
        const bar = document.getElementById(`bar-${i}`);
        if (bar) {
            bar.style.width = `${barWidth}px`;
            bar.style.transform = `translateX(${i * (barWidth + gap)}px)`;

            const heightPx = (val / maxVal) * (panelHeight * 0.95);
            bar.style.height = `${heightPx}px`;
        }
    });
}

function updateBarHeight(idx, val) {
    const bar = document.getElementById(`bar-${idx}`);
    if (bar) {
        const maxVal = Math.max(...array, 1);
        const wrapper = document.getElementById('bars-wrapper');
        const panelHeight = (wrapper && wrapper.clientHeight > 0) ? wrapper.clientHeight : 250;
        const heightPx = (val / maxVal) * (panelHeight * 0.95);
        bar.style.height = `${heightPx}px`;
    }
}

function setBarClass(idx, className) {
    const bar = document.getElementById(`bar-${idx}`);
    if (bar) {
        bar.className = 'bar'; // reset
        if (className) bar.classList.add(className);
    }
}

function resetBarClasses() {
    document.querySelectorAll('.bar').forEach(b => b.className = 'bar');
}

// ==========================================
// UTILITIES
// ==========================================
function updateSpeedText(val) {
    speedValue.textContent = val + '%';

    const glowSpread = 5 + (val / 100) * 15;
    const glowOpacity = 0.2 + (val / 100) * 0.6;

    speedSlider.style.setProperty('--slider-glow', `0 0 ${glowSpread}px rgba(0, 255, 255, ${glowOpacity.toFixed(2)})`);
    speedValue.style.setProperty('--text-glow', `0 0 ${glowSpread / 2}px rgba(0, 255, 255, ${(glowOpacity * 0.8).toFixed(2)})`);

    // Map 1-100 to actual delay in ms (inverted: higher value = lower delay)
    // 1 -> 500ms, 100 -> 2ms
    delay = Math.floor(500 - (val / 100) * 498);
}

function updateComplexity(algoName) {
    const c = complexities[algoName] || complexities['Bubble Sort'];
    compTimeBest.textContent = c.best;
    compTimeAvg.textContent = c.avg;
    compTimeWorst.textContent = c.worst;
    compSpace.textContent = c.space;
}

function updateButtonsState() {
    sizeSlider.disabled = isSorting;
    randomizeBtn.disabled = isSorting && !isPaused;
    startBtn.disabled = isSorting && !isPaused; // disabled if running, enabled if paused or stopped

    if (isSorting) {
        trigger.style.pointerEvents = 'none';
        trigger.style.opacity = '0.5';
    } else {
        trigger.style.pointerEvents = 'auto';
        trigger.style.opacity = '1';
    }
}

function updateStats() {
    statComparisons.textContent = comps;
    statSwaps.textContent = swaps;
}

function resetStats() {
    comps = 0;
    swaps = 0;
    elapsedTime = 0;
    updateStats();
    statTime.textContent = '0.00s';
    statusState.textContent = 'Idle';
    resetBarClasses();
}

function startTimer() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        statTime.textContent = (elapsedTime / 1000).toFixed(2) + 's';
    }, 50);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function sleep(ms) {
    return new Promise(resolve => {
        sleepResolve = resolve;
        sleepTimeout = setTimeout(() => {
            sleepResolve = null;
            resolve();
        }, ms);
    });
}

function wakeUp() {
    if (sleepResolve) {
        clearTimeout(sleepTimeout);
        let res = sleepResolve;
        sleepResolve = null;
        res();
    }
}

function cancelCurrentRun() {
    if (isSorting) {
        shouldStop = true;
        isPaused = false;
        currentRunId++;
        stopTimer();
        wakeUp();
        isSorting = false;
    }
}

async function checkState(runId) {
    if (runId !== currentRunId) throw new Error("STOP");
    while (isPaused && !shouldStop) {
        await sleep(50);
        if (runId !== currentRunId) throw new Error("STOP");
    }
    if (shouldStop || runId !== currentRunId) throw new Error("STOP");
    await sleep(delay);
    resetStats();
    renderArray();
}


// ==========================================
// ALGORITHMS ENTRY POINT
// ==========================================
async function startAlgorithm(runId) {
    resetBarClasses();
    try {
        states = [];
        let workingArray = [...array];
        switch (currentAlgorithm) {
            case 'Bubble Sort': generateBubbleSort(workingArray); break;
            case 'Selection Sort': generateSelectionSort(workingArray); break;
            case 'Insertion Sort': generateInsertionSort(workingArray); break;
            case 'Merge Sort': generateMergeSort(workingArray, 0, workingArray.length - 1); break;
            case 'Quick Sort': generateQuickSort(workingArray, 0, workingArray.length - 1); break;
            case 'Radix Sort': generateRadixSort(workingArray); break;
        }

        await executeStates(runId);

        if (!shouldStop && currentRunId === runId) {
            statusState.textContent = 'Sorted';
            stopTimer();
            playCompleteSound();
            // Green glow effect
            for (let i = 0; i < array.length; i++) {
                if (currentRunId !== runId) break;
                setBarClass(i, 'sorted');
                playSortedSound(i, array.length);
                await sleep(10); // small delay for visual wave
            }
        }
    } catch (e) {
        if (e.message === "STOP") {
            // Handled
            if (currentRunId === runId) {
                isSorting = false;
                updateButtonsState();
            }
            return;
        }
        console.error(e);
    }

    if (currentRunId === runId) {
        isSorting = false;
        isPaused = false;
        shouldStop = false;
        updateButtonsState();
    }
}

// ==========================================
// STATE ENGINE
// ==========================================
let states = [];

async function executeStates(runId) {
    for (let i = 0; i < states.length; i++) {
        await checkState(runId);
        let state = states[i];

        resetBarClasses();

        if (state.type === 'compare') {
            state.indices.forEach(idx => setBarClass(idx, 'comparing'));
            if (state.auxIndices) state.auxIndices.forEach(idx => setBarClass(idx, 'pivot'));
            comps++;
            if (i % 10 === 0 || delay > 10) updateStats();
            playCompareSound();
        } else if (state.type === 'pivot') {
            state.indices.forEach(idx => setBarClass(idx, 'pivot'));
            if (state.auxIndices) state.auxIndices.forEach(idx => setBarClass(idx, 'comparing'));
            playCompareSound();
        } else if (state.type === 'swap' || state.type === 'overwrite') {
            state.indices.forEach((idx, k) => {
                array[idx] = state.values[k];
                updateBarHeight(idx, array[idx]);
                setBarClass(idx, 'swapping');
            });
            swaps++;
            if (i % 10 === 0 || delay > 10) updateStats();
            playSwapSound();
        }
    }
    updateStats();
}

// ==========================================
// SORTING ALGORITHMS
// ==========================================

function generateBubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            states.push({ type: 'compare', indices: [j, j + 1] });
            if (arr[j] > arr[j + 1]) {
                states.push({ type: 'swap', indices: [j, j + 1], values: [arr[j + 1], arr[j]] });
                let temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

function generateSelectionSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        states.push({ type: 'pivot', indices: [i] });

        for (let j = i + 1; j < n; j++) {
            states.push({ type: 'compare', indices: [j], auxIndices: [minIdx] });
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
                states.push({ type: 'pivot', indices: [minIdx] });
            }
        }

        if (minIdx !== i) {
            states.push({ type: 'swap', indices: [i, minIdx], values: [arr[minIdx], arr[i]] });
            let temp = arr[i];
            arr[i] = arr[minIdx];
            arr[minIdx] = temp;
        }
    }
}

function generateInsertionSort(arr) {
    const n = arr.length;
    for (let i = 1; i < n; i++) {
        let key = arr[i];
        let j = i - 1;
        states.push({ type: 'pivot', indices: [i] });

        while (j >= 0) {
            states.push({ type: 'compare', indices: [j] });
            if (arr[j] > key) {
                states.push({ type: 'overwrite', indices: [j + 1], values: [arr[j]] });
                arr[j + 1] = arr[j];
                j--;
            } else {
                break;
            }
        }
        states.push({ type: 'overwrite', indices: [j + 1], values: [key] });
        arr[j + 1] = key;
    }
}

function generateMergeSort(arr, left, right) {
    if (left >= right) return;
    let mid = Math.floor((left + right) / 2);
    generateMergeSort(arr, left, mid);
    generateMergeSort(arr, mid + 1, right);
    generateMerge(arr, left, mid, right);
}

function generateMerge(arr, left, mid, right) {
    let n1 = mid - left + 1;
    let n2 = right - mid;
    let L = new Array(n1);
    let R = new Array(n2);
    for (let i = 0; i < n1; i++) L[i] = arr[left + i];
    for (let j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];

    let i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
        states.push({ type: 'compare', indices: [k] });
        if (L[i] <= R[j]) {
            states.push({ type: 'overwrite', indices: [k], values: [L[i]] });
            arr[k] = L[i];
            i++;
        } else {
            states.push({ type: 'overwrite', indices: [k], values: [R[j]] });
            arr[k] = R[j];
            j++;
        }
        k++;
    }
    while (i < n1) {
        states.push({ type: 'overwrite', indices: [k], values: [L[i]] });
        arr[k] = L[i];
        i++;
        k++;
    }
    while (j < n2) {
        states.push({ type: 'overwrite', indices: [k], values: [R[j]] });
        arr[k] = R[j];
        j++;
        k++;
    }
}

function generateQuickSort(arr, low, high) {
    if (low < high) {
        let pi = generatePartition(arr, low, high);
        generateQuickSort(arr, low, pi - 1);
        generateQuickSort(arr, pi + 1, high);
    }
}

function generatePartition(arr, low, high) {
    let pivot = arr[high];
    states.push({ type: 'pivot', indices: [high] });
    let i = (low - 1);

    for (let j = low; j <= high - 1; j++) {
        states.push({ type: 'compare', indices: [j], auxIndices: [high] });
        if (arr[j] < pivot) {
            i++;
            states.push({ type: 'swap', indices: [i, j], values: [arr[j], arr[i]] });
            let temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    states.push({ type: 'swap', indices: [i + 1, high], values: [arr[high], arr[i + 1]] });
    let temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    return i + 1;
}

function generateRadixSort(arr) {
    let max = Math.max(...arr, 1);
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        generateCountSort(arr, exp);
    }
}

function generateCountSort(arr, exp) {
    let n = arr.length;
    let output = new Array(n);
    let count = new Array(10).fill(0);

    for (let i = 0; i < n; i++) {
        states.push({ type: 'compare', indices: [i] });
        let index = Math.floor(arr[i] / exp) % 10;
        count[index]++;
    }

    for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
    }

    for (let i = n - 1; i >= 0; i--) {
        let index = Math.floor(arr[i] / exp) % 10;
        output[count[index] - 1] = arr[i];
        count[index]--;
    }

    for (let i = 0; i < n; i++) {
        states.push({ type: 'overwrite', indices: [i], values: [output[i]] });
        arr[i] = output[i];
    }
}

// Start app
window.onload = init;
