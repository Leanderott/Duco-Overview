
let chart;
let priceHistory = [];

// -------------------------
// USERNAME SYSTEM
// -------------------------
function getUser() {
    return localStorage.getItem("duco_user");
}

function setUser() {
    let user = prompt("Dein Duino-Coin Username:");
    if (!user) return;

    localStorage.setItem("duco_user", user);
}

// -------------------------
// CHART INIT
// -------------------------
function initChart() {
    const ctx = document.getElementById("priceChart").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "DUCO Kurs (USD)",
                data: [],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                borderColor: "orange"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { display: false }
            }
        }
    });
}

// -------------------------
// FETCH DUCO PRICE (USD)
// -------------------------
async function fetchPriceUSD() {
    try {
        const res = await fetch("https://server.duinocoin.com/prices");
        const data = await res.json();

        const price =
            data?.result?.DucoPrice ||
            data?.DucoPrice ||
            data?.price ||
            0.0001;

        return parseFloat(price);
    } catch (e) {
        console.log("Price error", e);
        return 0.0001;
    }
}

// -------------------------
// USD -> EUR
// -------------------------
async function fetchEURRate() {
    try {
        const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=EUR");
        const data = await res.json();
        return data.rates.EUR;
    } catch (e) {
        return 0.92;
    }
}

// -------------------------
// FETCH USER DATA
// -------------------------
async function fetchData() {
    const user = getUser();

    if (!user) {
        setUser();
        return;
    }

    try {
        const [userRes, priceUSD, eurRate] = await Promise.all([
            fetch(`https://server.duinocoin.com/users/${user}`),
            fetchPriceUSD(),
            fetchEURRate()
        ]);

        const data = await userRes.json();
        if (!data.result) return;

        const wallet = data.result.balance || 0;
        const hashrate = data.result.hashrate || 0;
        const miners = data.result.miners || [];

        const usd = priceUSD;
        const eur = usd * eurRate;

        updateUI(wallet, hashrate, miners.length, usd, eur);
        updateChart(usd);
        calculateStats(wallet);

        document.getElementById("updated").innerText =
            "Aktualisiert: " + new Date().toLocaleTimeString();

    } catch (e) {
        console.log("API Fehler:", e);
    }
}

// -------------------------
// UI UPDATE
// -------------------------
function updateUI(balance, hashrate, miners, usd, eur) {
    document.getElementById("balance").innerText =
        balance.toFixed(2) + " DUCO";

    document.getElementById("price").innerHTML =
        `$${usd.toFixed(6)} USD <br> €${eur.toFixed(6)} EUR`;

    document.getElementById("hashrate").innerText =
        hashrate + " H/s";

    document.getElementById("miners").innerText =
        miners;
}

// -------------------------
// CHART UPDATE (GREEN/RED)
// -------------------------
function updateChart(price) {
    const now = new Date().toLocaleTimeString();

    priceHistory.push(price);

    if (priceHistory.length > 50) priceHistory.shift();

    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(price);

    if (chart.data.labels.length > 50) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    const last = priceHistory[priceHistory.length - 2];

    if (last) {
        chart.data.datasets[0].borderColor =
            price > last ? "lime" : "red";
    }

    chart.update();
}

// -------------------------
// 24H STATS (SIMULIERT)
// -------------------------
let balanceHistory = [];

function calculateStats(balance) {
    balanceHistory.push({
        time: Date.now(),
        value: balance
    });

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    balanceHistory = balanceHistory.filter(x => x.time > dayAgo);

    if (balanceHistory.length < 2) return;

    const first = balanceHistory[0].value;
    const last = balanceHistory[balanceHistory.length - 1].value;

    const earned = last - first;

    document.getElementById("today").innerText =
        "+" + earned.toFixed(2) + " DUCO";

    document.getElementById("average").innerText =
        earned.toFixed(2) + " DUCO / 24h";
}

// -------------------------
// START
// -------------------------
window.addEventListener("load", () => {
    initChart();

    if (!localStorage.getItem("duco_user")) {
        setUser();
    }

    fetchData();
    console.log("Fetching DUCO data...");
    setInterval(fetchData, 5000);
});
}
console.log(data);
fetchData();
setInterval(fetchData, 5000);