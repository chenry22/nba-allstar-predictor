var chart = null;

var rankHistory = null;
var unbiasedRankHistory = null;

// filter by rank index
var minRange = 0;
var maxRangeExc = 24;

var selectedTeams = [];
const teamColors = {
    "ATL" : "rgb(200, 16, 46)", "BOS" : "rgb(8, 178, 42)",
    "BRK" : "rgb(0, 0, 0)", "CHO" : "rgb(0, 120, 140)",
    "CHI" : "rgb(206, 17, 65)", "CLE" : "rgb(134, 0, 56)",
    "DET" : "rgb(29,66,138)", "IND" : "rgb(253, 187, 48)",
    "MIA" : "rgb(152, 0, 46)", "MIL" : "rgb(2, 120, 31)",
    "NYK" : "rgb(228, 171, 44)", "ORL" : "rgb(150, 172, 207)",
    "PHI" : "rgb(0, 107, 182)", "TOR" : "rgb(103, 16, 187)",
    "WAS" : "rgb(244, 110, 237)", "DAL" : "rgb(0, 43, 92)", 
    "DEN" : "rgb(255, 198, 39)", "GSW" : "rgb(29, 66, 138, 205)", 
    "HOU" : "rgb(206,17,65)", "LAC" : "rgb(119, 209, 238)",
    "LAL" : "rgb(126, 52, 247)", "MEM" : "rgb(93, 118, 169)", 
    "MIN" : "rgb(12, 35, 64)", "NOP" : "rgb(180, 151, 90)", 
    "OKC" : "rgb(0, 125, 195)", "PHO" : "rgb(216, 155, 6)", 
    "POR" : "rgb(224, 58, 62)", "SAC" : "rgb(91,43,130)", 
    "SAS" : "rgb(151, 151, 151)", "UTA" : "rgb(62, 38, 128)"
};

// TODO: allow search by player
async function updateChart(){
    // first make sure to load rankHistory
    const rankData = await getRankHistory();
    const dates = Object.keys(rankData[0]).slice(2);

    // sort by rankings from most recent data
    rankData.sort((a, b) => (
        parseInt(a[dates[dates.length - 1]]) > parseInt(b[dates[dates.length - 1]]) ? 1 : -1
    ));

    var players = [];
    if(selectedTeams.length == 0){
        for(var i = minRange; i < maxRangeExc; i++){
            var vals = Object.values(rankData[i]);
            vals = vals.map(x => x < 0 ? null : x);
            players.push({
                label: vals[0],
                data: vals.slice(2),
                backgroundColor: teamColors[vals[1]],
                borderColor: teamColors[vals[1]],
                borderWidth: 2,
                tension: 0.3
            });
        }
    } else {
        for(var i = 0; i < rankData.length; i++){
            var vals = Object.values(rankData[i]);
            vals = vals.map(x => x < 0 ? null : x);
            if(selectedTeams.includes(vals[1]) && (i >= minRange && i < maxRangeExc)) {
                players.push({
                    label: vals[0],
                    data: vals.slice(2),
                    backgroundColor: teamColors[vals[1]],
                    borderColor: teamColors[vals[1]],
                    borderWidth: 2,
                    tension: 0.3
                });
            } 
        }
    }

    chart.options.scales.y.min = players.length < 5 || minRange <= 10 ? null : minRange - 10
    chart.options.scales.y.max = maxRangeExc + 10
    chart.data.datasets = players
    chart.update()
}
function selectTeam(team){
    document.getElementById("team-filter-div").getElementsByClassName(team)[0].classList.toggle("off");
    team = String(team).toUpperCase();
    if(!selectedTeams.includes(team)){
        selectedTeams.push(team);
    } else {
        selectedTeams = selectedTeams.filter(function(t) {
            return t !== team
        })
    }
    updateChart()
}

async function loadLineGraph(){
    // first make sure to load rankHistory
    const rankData = await getRankHistory();
    const dates = Object.keys(rankData[0]).slice(2);

    rankData.sort((a, b) => (
        // sort by most recent date
        parseInt(a[dates[dates.length - 1]]) > parseInt(b[dates[dates.length - 1]]) ? 1 : -1
    ));

    var players = [];
    for(var i = minRange; i < maxRangeExc; i++){
        var vals = Object.values(rankData[i]);
        vals = vals.map(x => x < 0 ? null : x);
        players.push({
            label: vals[0],
            data: vals.slice(2),
            backgroundColor: teamColors[vals[1]],
            borderColor: teamColors[vals[1]],
            borderWidth: 2,
            tension: 0.3
        });
    }

    chart = new Chart(document.getElementById("history-graph"), {
        type: 'line',
        data: {
            labels: dates,
            datasets: players
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 0,
                max: maxRangeExc + 10,
                ticks: {
                    // stepSize: 1,
                    // callback: function(i) {
                    //     return i === 1 || (i !== 0 && i % 5 === 0) ? i : null;
                    // }
                },
                title: {
                    display: true,
                    text: 'Ranking',
                    font: { size: 16 }
                }, 
                reverse: true // since we're doing rankings
              },
              x : {
                type: "time",
                time: {
                    parser: 'MMM dd, yyyy',
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM dd' // Desired display format
                    }
                },
                ticks: {
                    stepSize: 3
                },
                title: {
                    display: true,
                    text: 'Date',
                    font: { size: 16 }
                }
              }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(ctx) {
                            const date = new Date(ctx[0].parsed.x);
                            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return formattedDate;
                        }
                    }
                },
                legend: {
                    display: maxRangeExc - minRange <= 20,
                    position: "bottom",
                    labels: {
                        boxWidth: 16
                    }
                }
            }
          }
      });
}

// enforces one time fetch, then caches file
async function getRankHistory(bias = false) {
    if(rankHistory == null) {
        return fetch('/static/data/rank_history.csv').then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            rankHistory = parseCSV(data);
            return rankHistory;
        })
        .catch(error => console.error('Fetch error:', error));
    } else {
        return rankHistory
    }
}

// Parse CSV helper function
function parseCSV(csv) {
    const [headerLine, ...rows] = csv.trim().split("\n"); // get all rows
    const headers = headerLine.split(",\""); // get header arr
    headers[0] = headers[0].slice(1);
    headers[0] = "Name"
    headers.splice(1, 0, "Team")
    for(var i = 2; i < headers.length; i++){
        // getting rid of silly hanging quotation mark
        headers[i] = headers[i].slice(0, headers[i].length - 1);
    }

    var data = [];
    for(var j = 0; j < rows.length; j++){
        var values = rows[j].split(",");
        var obj = {};
        for(var i = 0; i < headers.length; i++){
            obj[headers[i]] = values[i + 1];
        }
        data.push(obj);
    }

    return data;
}

document.addEventListener('DOMContentLoaded', function() {
    // slider stuff, max and min listner favor new input
    const rangeInputvalue = document.getElementById("range-select-div").getElementsByTagName("input")
    rangeInputvalue[0].addEventListener("input", e => {
        if(!Number.isNaN(parseInt(rangeInputvalue[0].value))){
            minRange = parseInt(rangeInputvalue[0].value) - 1;
            if(minRange < 0){
                rangeInputvalue[0].value = 1;
                minRange = 0;
            }
            if (maxRangeExc <= minRange) {
                rangeInputvalue[1].value = minRange + 1;
                maxRangeExc = minRange + 1;
            }
            updateChart();
        }
    });
    rangeInputvalue[1].addEventListener("input", e => {
        if(!Number.isNaN(parseInt(rangeInputvalue[1].value) != null)){
            maxRangeExc = parseInt(rangeInputvalue[1].value);
            if(maxRangeExc > rankHistory.length){
                rangeInputvalue[1].value = rankHistory.length
                maxRangeExc = rankHistory.length;
            }
            if (maxRangeExc <= 0){
                rangeInputvalue[0].value = 1;
                rangeInputvalue[1].value = 1;
                minRange = 0;
                maxRangeExc = 1;

            }
            if (maxRangeExc <= minRange) {
                rangeInputvalue[0].value = maxRangeExc;
                minRange = maxRangeExc;
            }
            updateChart();
        }
    });
}, false);