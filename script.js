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
let soundEnabled = true;
let volume = 0.7; // Increased base volume for better audibility on mobile/tablets

const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundIcon = document.getElementById('sound-icon');
const soundText = document.getElementById('sound-text');

const savedSound = sessionStorage.getItem('neosort-sound');
if (savedSound === 'off') {
    soundEnabled = false;
}

function updateSoundUI() {
    if (!soundToggleBtn) return;
    if (soundEnabled) {
        soundIcon.textContent = '🔊';
        soundText.textContent = 'ON';
        soundToggleBtn.style.color = 'var(--cyan)';
        soundToggleBtn.style.borderColor = 'var(--cyan)';
    } else {
        soundIcon.textContent = '🔇';
        soundText.textContent = 'OFF';
        soundToggleBtn.style.color = 'var(--text-muted)';
        soundToggleBtn.style.borderColor = 'var(--panel-border)';
    }
}

function initAudio() {
    if (!soundEnabled) return;
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Sound Generators
function playTone(freq, type, duration, volMultiplier = 1) {
    if (!soundEnabled || !audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * volMultiplier, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playStartSound() {
    initAudio();
    playTone(440, 'sine', 0.1, 0.4);
    setTimeout(() => playTone(880, 'sine', 0.2, 0.4), 100);
}

function playStopSound() {
    if (!soundEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + 0.03); // smooth attack, slightly boosted for low freq
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // smooth release
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
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
    const maxVal = Math.max(...array, 1);
    
    // Get actual height of the panel to calculate pixel heights
    // This fixes the responsive rendering issue where percentage heights fail inside min-height containers
    const panelHeight = visualizationPanel.clientHeight > 0 ? visualizationPanel.clientHeight : 250;
    
    array.forEach((val, i) => {
        const bar = document.createElement('div');
        bar.classList.add('bar');
        
        // Calculate pixel height instead of percentage
        const heightPx = (val / maxVal) * (panelHeight * 0.95);
        bar.style.height = `${heightPx}px`;
        
        bar.id = `bar-${i}`;
        visualizationPanel.appendChild(bar);
    });
}

function updateBarHeight(idx, val) {
    const bar = document.getElementById(`bar-${idx}`);
    if (bar) {
        const maxVal = Math.max(...array, 1);
        bar.style.height = `${(val / maxVal) * 95}%`;
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
    if (shouldStop || runId !== currentRunId) throw new Error("STOP");
}

// ==========================================
// ALGORITHMS ENTRY POINT
// ==========================================
async function startAlgorithm(runId) {
    resetBarClasses();
    try {
        switch (currentAlgorithm) {
            case 'Bubble Sort': await bubbleSort(runId); break;
            case 'Selection Sort': await selectionSort(runId); break;
            case 'Insertion Sort': await insertionSort(runId); break;
            case 'Merge Sort': await mergeSort(0, array.length - 1, runId); break;
            case 'Quick Sort': await quickSort(0, array.length - 1, runId); break;
            case 'Radix Sort': await radixSort(runId); break;
        }
        
        if (!shouldStop && currentRunId === runId) {
            statusState.textContent = 'Sorted';
            stopTimer();
            playCompleteSound();
            // Green glow effect
            for(let i=0; i<array.length; i++) {
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
// SORTING ALGORITHMS
// ==========================================

// --- Bubble Sort ---
async function bubbleSort(runId) {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            await checkState(runId);
            setBarClass(j, 'comparing');
            setBarClass(j + 1, 'comparing');
            
            comps++;
            updateStats();

            playCompareSound();
            if (array[j] > array[j + 1]) {
                await checkState(runId);
                setBarClass(j, 'swapping');
                setBarClass(j + 1, 'swapping');
                playSwapSound();
                
                // Swap
                let temp = array[j];
                array[j] = array[j + 1];
                array[j + 1] = temp;
                swaps++;
                updateStats();
                
                updateBarHeight(j, array[j]);
                updateBarHeight(j + 1, array[j + 1]);
            }
            
            await checkState(runId);
            setBarClass(j, '');
            setBarClass(j + 1, '');
        }
    }
}

// --- Selection Sort ---
async function selectionSort(runId) {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        setBarClass(i, 'pivot');
        
        for (let j = i + 1; j < n; j++) {
            await checkState(runId);
            setBarClass(j, 'comparing');
            
            comps++;
            updateStats();
            
            playCompareSound();
            if (array[j] < array[minIdx]) {
                if (minIdx !== i) setBarClass(minIdx, '');
                minIdx = j;
                setBarClass(minIdx, 'swapping');
            } else {
                setBarClass(j, '');
            }
        }
        
        if (minIdx !== i) {
            await checkState(runId);
            playSwapSound();
            let temp = array[i];
            array[i] = array[minIdx];
            array[minIdx] = temp;
            swaps++;
            updateStats();
            
            updateBarHeight(i, array[i]);
            updateBarHeight(minIdx, array[minIdx]);
        }
        setBarClass(minIdx, '');
        setBarClass(i, '');
    }
}

// --- Insertion Sort ---
async function insertionSort(runId) {
    const n = array.length;
    for (let i = 1; i < n; i++) {
        let key = array[i];
        let j = i - 1;
        
        setBarClass(i, 'swapping');
        await checkState(runId);
        
        while (j >= 0) {
            comps++;
            updateStats();
            setBarClass(j, 'comparing');
            await checkState(runId);
            
            playCompareSound();
            if (array[j] > key) {
                playSwapSound();
                array[j + 1] = array[j];
                swaps++;
                updateStats();
                updateBarHeight(j + 1, array[j + 1]);
                setBarClass(j, '');
                j = j - 1;
            } else {
                setBarClass(j, '');
                break;
            }
        }
        array[j + 1] = key;
        updateBarHeight(j + 1, array[j + 1]);
        setBarClass(j + 1, '');
        setBarClass(i, '');
    }
}

// --- Merge Sort ---
async function mergeSort(left, right, runId) {
    if (left >= right) return;
    
    let mid = Math.floor((left + right) / 2);
    await mergeSort(left, mid, runId);
    await mergeSort(mid + 1, right, runId);
    await merge(left, mid, right, runId);
}

async function merge(left, mid, right, runId) {
    let n1 = mid - left + 1;
    let n2 = right - mid;
    
    let L = new Array(n1);
    let R = new Array(n2);
    
    for (let i = 0; i < n1; i++) L[i] = array[left + i];
    for (let j = 0; j < n2; j++) R[j] = array[mid + 1 + j];
    
    let i = 0, j = 0, k = left;
    
    while (i < n1 && j < n2) {
        await checkState(runId);
        setBarClass(k, 'comparing');
        comps++;
        updateStats();
        playCompareSound();
        
        if (L[i] <= R[j]) {
            array[k] = L[i];
            i++;
        } else {
            array[k] = R[j];
            j++;
        }
        playSwapSound();
        updateBarHeight(k, array[k]);
        swaps++;
        updateStats();
        
        await checkState(runId);
        setBarClass(k, '');
        k++;
    }
    
    while (i < n1) {
        await checkState(runId);
        setBarClass(k, 'swapping');
        playSwapSound();
        array[k] = L[i];
        updateBarHeight(k, array[k]);
        swaps++;
        updateStats();
        await checkState(runId);
        setBarClass(k, '');
        i++;
        k++;
    }
    
    while (j < n2) {
        await checkState(runId);
        setBarClass(k, 'swapping');
        playSwapSound();
        array[k] = R[j];
        updateBarHeight(k, array[k]);
        swaps++;
        updateStats();
        await checkState(runId);
        setBarClass(k, '');
        j++;
        k++;
    }
}

// --- Quick Sort ---
async function quickSort(low, high, runId) {
    if (low < high) {
        let pi = await partition(low, high, runId);
        await quickSort(low, pi - 1, runId);
        await quickSort(pi + 1, high, runId);
    }
}

async function partition(low, high, runId) {
    let pivot = array[high];
    setBarClass(high, 'pivot');
    let i = (low - 1);
    
    for (let j = low; j <= high - 1; j++) {
        await checkState(runId);
        setBarClass(j, 'comparing');
        comps++;
        updateStats();
        playCompareSound();
        
        if (array[j] < pivot) {
            i++;
            playSwapSound();
            // Swap
            let temp = array[i];
            array[i] = array[j];
            array[j] = temp;
            swaps++;
            updateStats();
            
            updateBarHeight(i, array[i]);
            updateBarHeight(j, array[j]);
        }
        setBarClass(j, '');
    }
    
    await checkState(runId);
    playSwapSound();
    let temp = array[i + 1];
    array[i + 1] = array[high];
    array[high] = temp;
    swaps++;
    updateStats();
    
    updateBarHeight(i + 1, array[i + 1]);
    updateBarHeight(high, array[high]);
    
    setBarClass(high, '');
    setBarClass(i + 1, '');
    return i + 1;
}

// --- Radix Sort ---
async function radixSort(runId) {
    let max = Math.max(...array);
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        await countSort(exp, runId);
    }
}

async function countSort(exp, runId) {
    let n = array.length;
    let output = new Array(n);
    let count = new Array(10).fill(0);
    
    for (let i = 0; i < n; i++) {
        await checkState(runId);
        let index = Math.floor(array[i] / exp) % 10;
        count[index]++;
        setBarClass(i, 'comparing');
        playCompareSound();
        await checkState(runId);
        setBarClass(i, '');
    }
    
    for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
    }
    
    for (let i = n - 1; i >= 0; i--) {
        await checkState(runId);
        let index = Math.floor(array[i] / exp) % 10;
        output[count[index] - 1] = array[i];
        count[index]--;
    }
    
    for (let i = 0; i < n; i++) {
        await checkState(runId);
        setBarClass(i, 'swapping');
        playSwapSound();
        array[i] = output[i];
        updateBarHeight(i, array[i]);
        swaps++;
        updateStats();
        await checkState(runId);
        setBarClass(i, '');
    }
}

// Start app
window.onload = init;
