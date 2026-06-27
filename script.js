window.onload = function() {
    document.getElementById('username-input').value = "";
};

let username = "";
let priceChart;
let lastPrice = 0;
let lastMinerCount = -1; 
let calculatedDailyDuco = 0;
let currentPriceUsd = 0.00005; // Standard-Fallback, falls API träge ist

const milestones = [1, 100, 500, 1000, 10000, 100000, 1000000, 10000000, 100000000];

const loginOverlay = document.getElementById('login-overlay');
const dashboard = document.getElementById('dashboard');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const userDisplay = document.getElementById('user-display');
const trendIndicator = document.getElementById('trend-indicator');

loginBtn.addEventListener('click', () => {
    username = usernameInput.value.trim().toLowerCase(); 
    if (username !== "") {
        userDisplay.textContent = `@${username.toUpperCase()}`;
        loginOverlay.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        initChart();
        
        // Beide Systeme sofort und unabhängig voneinander triggern
        fetchUserData();
        fetchGlobalMarket();
        
        // Alle 10 Sekunden Updates ziehen
        setInterval(fetchUserData, 10000);
        setInterval(fetchGlobalMarket, 10000);
    } else {
        alert("Please enter a valid Duino-Coin username.");
    }
});

function playSound(type) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (type === 'achievement') {
        const notes = [130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 523.25]; 
        notes.forEach((freq, index) => {
            setTimeout(() => {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'triangle'; 
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.8);
            }, index * 80); 
        });
    } else if (type === 'alarm') {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

function triggerAchievementNotification(milestoneValue) {
    const popup = document.getElementById('achievement-popup');
    document.getElementById('achievement-text').innerHTML = `You just passed the <strong>${milestoneValue.toLocaleString()} DUCO</strong> Milestone!`;
    
    playSound('achievement');
    popup.classList.add('show');
    
    setTimeout(() => { popup.classList.remove('show'); }, 5000);
}

function handleMilestones(currentBalance) {
    let currentTarget = milestones[0];
    let previousTarget = 0;
    
    for (let i = 0; i < milestones.length; i++) {
        if (currentBalance < milestones[i]) {
            currentTarget = milestones[i];
            previousTarget = i > 0 ? milestones[i-1] : 0;
            break;
        }
    }
    
    let savedMilestone = localStorage.getItem(`duco_milestone_${username}`);
    if (savedMilestone && parseFloat(savedMilestone) < currentTarget && previousTarget > 0) {
        if (currentBalance >= previousTarget && parseFloat(savedMilestone) < previousTarget) {
            triggerAchievementNotification(previousTarget);
        }
    }
    localStorage.setItem(`duco_milestone_${username}`, currentTarget);

    document.getElementById('next-milestone-val').textContent = `${currentTarget.toLocaleString()} DUCO`;
    let range = currentTarget - previousTarget;
    let progressInRange = currentBalance - previousTarget;
    let percent = (progressInRange / range) * 100;
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    
    document.getElementById('milestone-progress').style.width = `${percent}%`;
}

function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(255, 102, 0, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], 
            datasets: [{
                label: 'Global Price (USD)',
                data: [],
                borderColor: '#ff6600', 
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: '#ffffff',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: '#111111' }, ticks: { color: '#555' } },
                y: { 
                    grid: { color: '#111111' }, 
                    ticks: { 
                        color: '#555',
                        callback: function(value) { return '$' + value.toFixed(6); }
                    } 
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChartColor(trend, currentPrice) {
    if (!priceChart || !priceChart.data.datasets[0]) return;
    const ctx = document.getElementById('priceChart').getContext('2d');
    let newGradient = ctx.createLinearGradient(0, 0, 0, 300);
    
    if (trend === 'up') {
        priceChart.data.datasets[0].borderColor = '#00ff00'; 
        newGradient.addColorStop(0, 'rgba(0, 255, 0, 0.2)');
        newGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        trendIndicator.textContent = `Price Rising ▲ ($${currentPrice.toFixed(6)})`;
        trendIndicator.className = "trend-up";
    } else if (trend === 'down') {
        priceChart.data.datasets[0].borderColor = '#ff0000'; 
        newGradient.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
        newGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        trendIndicator.textContent = `Price Falling ▼ ($${currentPrice.toFixed(6)})`;
        trendIndicator.className = "trend-down";
    } else {
        priceChart.data.datasets[0].borderColor = '#ff6600'; 
        newGradient.addColorStop(0, 'rgba(255, 102, 0, 0.2)');
        newGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        trendIndicator.textContent = `Stable ($${currentPrice.toFixed(6)})`;
        trendIndicator.className = "trend-neutral";
    }
    
    priceChart.data.datasets[0].backgroundColor = newGradient;
    priceChart.update();
}

// --- SEPARATE ABFRAGE 1: USER DATEN (Läuft völlig unabhängig) ---
async function fetchUserData() {
    try {
        const userResponse = await fetch(`https://server.duinocoin.com/v2/users/${username}`);
        const userData = await userResponse.json();
        
        if (userData && userData.success && userData.result) {
            const miners = userData.result.miners || [];
            const currentMinerCount = miners.length;
            document.getElementById('miner-count').textContent = currentMinerCount;
            
            if (lastMinerCount !== -1 && currentMinerCount < lastMinerCount) {
                playSound('alarm');
            }
            lastMinerCount = currentMinerCount;

            const balanceData = userData.result.balance || {};
            const currentBalance = balanceData.balance || 0;
            document.getElementById('account-balance').innerHTML = `${currentBalance.toFixed(2)} <span class="currency">DUCO</span>`;
            handleMilestones(currentBalance);

            let totalHashrate = 0;
            let hardwareCounts = {};
            calculatedDailyDuco = 0; // Reset für Neuberechnung

            miners.forEach(miner => {
                if (miner.hashrate) {
                    totalHashrate += parseFloat(miner.hashrate);
                    calculatedDailyDuco += (parseFloat(miner.hashrate) * 0.0072);
                }
                let software = miner.software || "Unknown Device";
                hardwareCounts[software] = (hardwareCounts[software] || 0) + 1;
            });
            
            const hashrateKhas = totalHashrate / 1000;
            document.getElementById('total-hashrate').innerHTML = `${hashrateKhas.toFixed(2)} <span class="currency">KH/s</span>`;
            document.getElementById('estimated-earnings').innerHTML = `${calculatedDailyDuco.toFixed(2)} <span class="currency">DUCO</span>`;

            const breakdownContainer = document.getElementById('hardware-breakdown');
            breakdownContainer.innerHTML = "";
            for (const [hwName, count] of Object.entries(hardwareCounts)) {
                breakdownContainer.innerHTML += `
                    <div class="hardware-item">
                        <span>⚙️ ${hwName}:</span>
                        <strong>${count}</strong>
                    </div>
                `;
            }

            // Direkt USD updaten, falls Marktpreis schon da ist
            const dailyUsdValue = calculatedDailyDuco * currentPriceUsd;
            document.getElementById('usd-earnings').innerHTML = `$${dailyUsdValue.toFixed(4)} <span class="currency">USD</span>`;
        }
    } catch (error) {
        console.error("User Data Sync Error:", error);
    }
}

// --- SEPARATE ABFRAGE 2: MARKT PREIS & GRAPH ---
async function fetchGlobalMarket() {
    try {
        const apiResponse = await fetch('https://server.duinocoin.com/api_context');
        const apiData = await apiResponse.json();
        
        currentPriceUsd = apiData["Duco price"] || 0.00005;
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const dailyUsdValue = calculatedDailyDuco * currentPriceUsd;
        document.getElementById('usd-earnings').innerHTML = `$${dailyUsdValue.toFixed(4)} <span class="currency">USD</span>`;

        if (priceChart.data.labels.length > 15) {
            priceChart.data.labels.shift();
            priceChart.data.datasets[0].data.shift();
        }

        priceChart.data.labels.push(currentTime);
        priceChart.data.datasets[0].data.push(currentPriceUsd);

        if (lastPrice !== 0) {
            if (currentPriceUsd > lastPrice) {
                updateChartColor('up', currentPriceUsd);
            } else if (currentPriceUsd < lastPrice) {
                updateChartColor('down', currentPriceUsd);
            }
        } else {
            updateChartColor('neutral', currentPriceUsd);
        }
        
        lastPrice = currentPriceUsd;
        priceChart.update();
    } catch (error) {
        console.error("Market Data Sync Error:", error);
    }
}