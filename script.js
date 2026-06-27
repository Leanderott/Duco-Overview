// Force fresh login state on every single site load
window.onload = function() {
    document.getElementById('username-input').value = "";
};

let username = "";
let priceChart;
let lastPrice = 0;

// DOM Selectors
const loginOverlay = document.getElementById('login-overlay');
const dashboard = document.getElementById('dashboard');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const userDisplay = document.getElementById('user-display');
const trendIndicator = document.getElementById('trend-indicator');

// Event Listener for Login
loginBtn.addEventListener('click', () => {
    username = usernameInput.value.trim().toLowerCase(); // API benötigt Kleinbuchstaben
    if (username !== "") {
        userDisplay.textContent = `@${username.toUpperCase()}`;
        loginOverlay.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        // Boot Tracking Engine
        initChart();
        fetchDucoSystem();
        
        // GENAU ALLE 10 SEKUNDEN AKTUALISIEREN (10000 ms)
        setInterval(fetchDucoSystem, 10000);
    } else {
        alert("Please enter a valid Duino-Coin username.");
    }
});

// Advanced Chart Setup for Global DUCO to USD Tracking
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(255, 102, 0, 0.15)');
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
                borderWidth: 4,
                tension: 0.3,
                pointRadius: 4,
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
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Adaptive Color-Shift Logic (Green for Rise, Red for Fall)
function updateChartColor(trend, currentPrice) {
    if (!priceChart || !priceChart.data.datasets[0]) return;
    
    if (trend === 'up') {
        priceChart.data.datasets[0].borderColor = '#00ff00'; 
        trendIndicator.textContent = `Price Rising ▲ ($${currentPrice.toFixed(6)})`;
        trendIndicator.className = "trend-up";
    } else if (trend === 'down') {
        priceChart.data.datasets[0].borderColor = '#ff0000'; 
        trendIndicator.textContent = `Price Falling ▼ ($${currentPrice.toFixed(6)})`;
        trendIndicator.className = "trend-down";
    } else {
        priceChart.data.datasets[0].borderColor = '#ff6600'; 
        trendIndicator.textContent = `Stable ($${currentPrice.toFixed(6)})`;
        trendIndicator.className = "trend-neutral";
    }
    priceChart.update();
}

// Master Async Engine pulling data from both Network and User Nodes
async function fetchDucoSystem() {
    try {
        // --- 1. GET USER STATISTICS & LIVE BALANCE ---
        const userResponse = await fetch(`https://server.duinocoin.com/v2/users/${username}`);
        const userData = await userResponse.json();
        
        let calculatedDailyDuco = 0;

        if (userData && userData.success && userData.result) {
            const miners = userData.result.miners || [];
            document.getElementById('miner-count').textContent = miners.length;
            
            const balanceData = userData.result.balance || {};
            const currentBalance = balanceData.balance || 0;
            document.getElementById('account-balance').innerHTML = `${currentBalance.toFixed(2)} <span class="currency">DUCO</span>`;

            let totalHashrate = 0;
            miners.forEach(miner => {
                if (miner.hashrate) totalHashrate += parseFloat(miner.hashrate);
            });
            
            const hashrateKhas = totalHashrate / 1000;
            document.getElementById('total-hashrate').innerHTML = `${hashrateKhas.toFixed(2)} <span class="currency">KH/s</span>`;

            if (miners.length > 0) {
                miners.forEach(miner => {
                    if (miner.hashrate) {
                        calculatedDailyDuco += (parseFloat(miner.hashrate) * 0.0072); 
                    }
                });
            }
            document.getElementById('estimated-earnings').innerHTML = `${calculatedDailyDuco.toFixed(2)} <span class="currency">DUCO</span>`;
        }

        // --- 2. GET GLOBAL MARKET VALUES FOR USD GRAPH & FIAT EVALUATION ---
        const apiResponse = await fetch('https://server.duinocoin.com/api_context');
        const apiData = await apiResponse.json();
        
        const currentPriceUsd = apiData["Duco price"] || 0.00005;
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const dailyUsdValue = calculatedDailyDuco * currentPriceUsd;
        document.getElementById('usd-earnings').innerHTML = `$${dailyUsdValue.toFixed(4)} <span class="currency">USD</span>`;

        // --- 3. CHART PROCESSING ---
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
        console.error("Dashboard Sync Error:", error);
    }
}
