// for these data files, we should only require one fetch per session
var currPlayers = null;
var leaderboard = null;
var unbiasedLeaderboard = null;

var teamFilters = [];

// Function for parsing a form to be submitted to the predictor
function submitData() { 
    var form = document.getElementById("inputform");
    var data = new FormData(form);
    var inputArray = new Array();

    // Make sure inputs are valid (no negatives, plausible ranges, etc)
    for (var[key, value] of data){
        if(value < 0){
            document.querySelector("[name='" + key + "']").value = 0;
            alert("Negative values are not valid.");
            return false;
        }

        if((key == "gplayed") && value > 82){
            document.querySelector("[name='" + key + "']").value = 82;
            alert("Maximum games is 82")
            return false;
        }

        if(key == "gstarted"){
            if(value > 82){
                document.querySelector("[name='" + key + "']").value = 82;
                alert("Maximum games is 82")
                return false;
            } else if (value > inputArray[0]){
                document.querySelector("[name='" + key + "']").value = inputArray[0];
                alert("Cannot have more GS than GP.");
                return false;
            }
        }

        if(key == "allstarnum"){
            value = Math.round(value)
            document.querySelector("[name='" + key + "']").value = value;
        }

        if (!value){
            inputArray.push(0)
        } else{
            inputArray.push(parseFloat(value))
        }

        if((key == "fgapg") && (inputArray[3] > inputArray[4])){
            document.querySelector("[name='" + key + "']").value = inputArray[3];
            alert("Cannot have more FG than FGA.");
            return false;
        }

        if(key == "3papg"){
            if(inputArray[5] > inputArray[6]){
                document.querySelector("[name='" + key + "']").value = inputArray[5];
                alert("Cannot have more 3P than 3PA");
                return false;
            }

            var check = inputArray.push(inputArray[3] - inputArray[5])

            if(inputArray[check - 1] < 0){
                alert("3P cannot be greater than FG");
                return false;
            }

            check = inputArray.push(inputArray[4] - inputArray[6])

            if(inputArray[check - 1] < 0){
                alert("3PA cannot be greater than FGA");
                return false;
            }
        }

        if((key == "ftapg" ) && (inputArray[9] > inputArray[10])){
            document.querySelector("[name='" + key + "']").value = inputArray[9];
            alert("FT cannot be greater than FTA");
            return false;
        }

        if(key == "drpg"){
            inputArray.push(inputArray[11] + inputArray[12])
        }

        if(key == "bpg"){
            var pts = (3 * inputArray[5]) + (2 * inputArray[7]) + inputArray[9];
            inputArray.push(pts)
        }

        if(key == "winpct"){
            if(value > 1){
                document.querySelector("[name='" + key + "']").value = 1.0;
                alert("Win % cannot be greater than 1.0");
                return false;
            }

            if(inputArray[4] > 0){
                inputArray.push((inputArray[17] / inputArray[4]).toFixed(2));
            } else{
                inputArray.push(inputArray[4]);
            }
        }
    }

    for(var i = 0; i < inputArray.length - 1; i++){
        inputArray[i] = Math.round(inputArray[i] * 100) / 100;
    };

    var row1 = document.getElementById("show_vals_1").getElementsByTagName('td');
    var row2 = document.getElementById("show_vals_2").getElementsByTagName('td');
    var row3 = document.getElementById("show_vals_3").getElementsByTagName('td');

    // Updating data table with last input
    for(var i = 0; i < Math.max(row1.length, row2.length, row3.length); i++){
        if(i < row1.length){
            row1[i].innerHTML = inputArray[i];
        }
        if(i < row2.length){
            row2[i].innerHTML = inputArray[i + row1.length];
        }
        if(i < row3.length){
            row3[i].innerHTML = inputArray[i + row1.length + row2.length];
        }
    }

    getPredictions(inputArray);
    return false;
}
// Actual prediction functionality (post form and get prediction)
function getPredictions(arr_in){
    jQuery.ajax({
        url: '/process',
        type: 'POST',
        data: JSON.stringify(arr_in), 
        contentType: "application/json",

        success: function(response) {
            console.log(response)
            document.getElementById('return_pct').innerHTML = response.prob;
            document.getElementById('return_dec').innerHTML = response.decision;

            if(response.decision == "All-Star."){
                document.getElementById("returns-bg").style.backgroundColor = "#4AA784";
                document.getElementById("returns-bg").style.color = "black";

                document.getElementById("returns").style.backgroundColor = "#4AA784";
                document.getElementById("returns").style.color = "black";
            } else{
                document.getElementById("returns-bg").style.backgroundColor = "#E10D10";
                document.getElementById("returns-bg").style.color = "white";

                document.getElementById("returns").style.backgroundColor = "#E10D10";
                document.getElementById("returns").style.color = "white";
            }
        }, 
        error: function(error) { 
            console.log(error); 
        } 
    }); 
}

// Updates search results while typing
function searchUpdate(){
    var matching = matchCurrentText(getCurrPlayerData());
    var input = document.getElementById('search_input');
    var dropdown = document.getElementById('search-dropdown');
    dropdown.innerHTML = '';

    matching.forEach(function(item) {
        var div = document.createElement('div');
        div.className = 'dropdown-item';
        div.textContent = item;
        div.onclick = function() {
            input.value = item;
            dropdown.style.display = 'none';
            matchCurrentText(getCurrPlayerData());
        };
        dropdown.appendChild(div);
    });

    dropdown.style.display = matching.length > 0 ? 'block' : 'none';
}
// Fills out form on search submission (and auto submits form)
function searchGetData() {
    var matching = matchCurrentText(getCurrPlayerData());
    var player_index = parseInt(document.getElementById("search_input").dataset.playerIndex);

    if(isNaN(player_index) || player_index < 0){
        console.log("Parse Int Error");
        alert("Player not found.");
        return false;
    } else{
        document.getElementById('search_input').value = matching[0];
        document.getElementById('search-dropdown').style.display = 'none';
    }

    var dataLabels = ["Games Played", "Games Started", "MPG",
        "FG", "FGA", "3P", "3PA", "FT", "FTA", "ORB", "DRB", "AST", "STL",
        "BLK", "TOV", "Previous Times All-Star", "Win Percent", "% All Star"];

    var slice = currPlayers[player_index];
    var form = new FormData(document.getElementById('inputform'));
    var formKeys = [];

    for(var[key, value] of form){
        formKeys.push(key);
    }

    for(var i = 0; i < formKeys.length; i++){
        document.querySelector("[name='" + formKeys[i] + "']").value = slice[dataLabels[i]];
    }

    submitData();
    return false; // prevent default form submit
}

// loads data or returns loaded data
function getCurrPlayerData() {
    if(currPlayers == null) {
        fetch('/static/data/curr_player.csv').then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            currPlayers = parseCSV(data,
                ["Name", "Position", "Age", "Team", "Games Played", "Games Started",
                "MPG", "FGA", "FG%", "3PA", "3P%", "FTA",
                "FT%", "ORB", "DRB", "AST", "STL", "BLK",
                "TOV", "PF", "PTS", 
                "Last Game", "Last Location", "Last Result",
                "Last MP", "Last PTS", "Last TRB", "Last AST",
                "Last STL", "Last BLK", "Last FG", "Last 3P", "Last FT",
                "Last TOV", "Last PF", "Last +/-",
                "Previous Times All-Star", "Win Percent",
                "% All Star", "Change"]);
            return currPlayers;
        })
        .catch(error => console.error('Fetch error:', error));
    } else {
        return currPlayers
    }
}
// Parse CSV helper function
function parseCSV(csvContent, selectedColumns) {
    var lines = csvContent.split('\n');
    var headers = lines[0].split(',');
    var columnIndices = selectedColumns.map(column => headers.indexOf(column));
    var dataArray = [];

    for (var i = 1; i < lines.length - 1; i++) {
        var currentLine = lines[i].split(',');
        var dataObject = {};

        for (var j = 0; j < columnIndices.length; j++) {
            var columnIndex = columnIndices[j];
            dataObject[selectedColumns[j]] = currentLine[columnIndex];
        }

        dataArray.push(dataObject);
    }

    return dataArray;
}

// Helper function to find matching search results
function matchCurrentText(data){
    var input = document.getElementById("search_input").value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if(input.length < 1){
        return [];
    }

    var matching = [];
    var index = -1;
    for(var i = 0; i < data.length; i++){
        var name = data[i].Name;
        if(name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(input) != -1){
            matching.push(name);
            index = data[i][""];
        }
    }

    if(matching.length == 1){
        document.getElementById("search_input").dataset.playerIndex = index;
    } else{
        document.getElementById("search_input").dataset.playerIndex = -1;
    }

    return matching;
}


// Leaderboard data loader
function loadLeaderboardData(){
    fetch('/static/data/east_leaders.csv').then(response => {
        if (!response.ok) {
            throw new Error('File not found');
        }
        return response.text();
    })
    .then(data => {
        var leaderboard = parseCSV(data, 
            ["Name", "Position", "Age", "Team", "Games Played", "Games Started",
            "MPG", "FGA", "FG%", "3PA", "3P%", "FTA",
            "FT%", "ORB", "DRB", "AST", "STL", "BLK",
            "TOV", "PF", "PTS", 
            "Last Game", "Last Location", "Last Result",
            "Last MP", "Last PTS", "Last TRB", "Last AST",
            "Last STL", "Last BLK", "Last FG", "Last 3P", "Last FT",
            "Last TOV", "Last PF", "Last +/-",
            "Previous Times All-Star", "Win Percent",
            "% All Star", "Change"]);

        var slots = document.getElementsByClassName('player-east');
        var stats = document.getElementsByClassName('data-east');
        var lineup = document.getElementsByClassName('lineup-east');
        var front = 0;
        var back = 0;
        var wild = 0;
        var temp = null;

        for(var i = 0; i < 15; i++){
            var cols = slots[i].getElementsByTagName('td');
            var player = leaderboard[i];

            // flexbox dropdown table thing
            stats[i].classList.add(player["Team"].toLowerCase() + "_alt");
            stats[i].getElementsByTagName('td')[0].appendChild(createDataDropdown(player));

            // regular table stuff
            cols[0].innerHTML = "<b>" + (i + 1) + "</b>";
            cols[1].innerHTML = player['Change'];
            cols[2].innerHTML = player['Name'];
            cols[3].innerHTML = player['Team'];
            cols[4].innerHTML = player['Position'];
            cols[5].innerHTML = player['Age'];
            cols[6].innerHTML = player['Previous Times All-Star'];
            cols[7].innerHTML = player['% All Star'];

            if(front + back + wild < 12){
                if(player['Position'].charAt(1) == 'G'){
                    if(front < 2){
                        temp = lineup[0].getElementsByTagName('td')[front];
                        front++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(front < 4){
                        temp = lineup[1].getElementsByTagName('td')[front - 2];
                        front++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    }
                } else{
                    if(back < 3){
                        temp = lineup[0].getElementsByTagName('td')[back + 2];
                        back++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(back < 6){
                        temp = lineup[1].getElementsByTagName('td')[back - 1];
                        back++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    }
                }
            }

            for(var j = 2; j < 8; j++){
                cols[j].classList.add(player["Team"].toLowerCase());
            }
            cols[0].style.backgroundColor = 'wheat';
            
            var change = player['Change'].charAt(0);
            if(change == '+'){
                cols[1].style.backgroundColor = 'lightgreen';
            } else if(change == '-'){
                cols[1].style.backgroundColor = 'salmon';
            } else{
                cols[1].style.backgroundColor = 'grey';
            }
        }
    })

    // Update eastern conference
    fetch('/static/data/west_leaders.csv').then(response => {
        if (!response.ok) {
            throw new Error('File not found');
        }
        return response.text();
    })
    .then(data => {
        var leaderboard = parseCSV(data, 
            ["Name", "Position", "Age", "Team", "Games Played", "Games Started",
            "MPG", "FGA", "FG%", "3PA", "3P%", "FTA",
            "FT%", "ORB", "DRB", "AST", "STL", "BLK",
            "TOV", "PF", "PTS", 
            "Last Game", "Last Location", "Last Result",
            "Last MP", "Last PTS", "Last TRB", "Last AST",
            "Last STL", "Last BLK", "Last FG", "Last 3P", "Last FT",
            "Last TOV", "Last PF", "Last +/-",
            "Previous Times All-Star", "Win Percent",
            "% All Star", "Change"]);

        var slots = document.getElementsByClassName('player-west');

        var stats = document.getElementsByClassName('data-west');

        var lineup = document.getElementsByClassName('lineup-west');
        var front = 0;
        var back = 0;
        var wild = 0;
        var temp = null;

        for(var i = 0; i < 15; i++){
            var cols = slots[i].getElementsByTagName('td');
            var player = leaderboard[i];

            stats[i].classList.add(player["Team"].toLowerCase() + "_alt");
            stats[i].getElementsByTagName('td')[0].appendChild(createDataDropdown(player));

            cols[0].innerHTML = "<b>" + (i + 1) + "</b>";
            cols[1].innerHTML = player['Change'];
            cols[2].innerHTML = player['Name'];
            cols[3].innerHTML = player['Team'];
            cols[4].innerHTML = player['Position'];
            cols[5].innerHTML = player['Age'];
            cols[6].innerHTML = player['Previous Times All-Star'];
            cols[7].innerHTML = player['% All Star'];

            if(front + back + wild < 12){
                if(player['Position'].charAt(1) == 'G'){
                    if(front < 2){
                        temp = lineup[0].getElementsByTagName('td')[front];
                        front++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(front < 4){
                        temp = lineup[1].getElementsByTagName('td')[front - 2];
                        front++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    }
                } else{
                    if(back < 3){
                        temp = lineup[0].getElementsByTagName('td')[back + 2];
                        back++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(back < 6){
                        temp = lineup[1].getElementsByTagName('td')[back - 1];
                        back++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                        temp.innerHTML = player['Name'];
                        temp.classList.add(player["Team"].toLowerCase());
                    }
                }
            }

            for(var j = 2; j < 8; j++){
                cols[j].classList.add(player["Team"].toLowerCase());
            }

            cols[0].style.backgroundColor = 'wheat';
            
            var change = player['Change'].charAt(0);
            if(change == '+'){
                cols[1].style.backgroundColor = 'lightgreen';
            } else if(change == '-'){
                cols[1].style.backgroundColor = 'salmon';
            } else{
                cols[1].style.backgroundColor = 'grey';
            }
        }
    })

    return;
}

function loadAllPlayerData(){
    if(leaderboard == null){
        // Update western conference
        fetch('/static/data/curr_player.csv').then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            leaderboard = parseCSV(data, 
                ["Name", "Position", "Age", "Team", "Games Played", "Games Started",
                    "MPG", "FGA", "FG%", "3PA", "3P%", "FTA",
                    "FT%", "ORB", "DRB", "AST", "STL", "BLK",
                    "TOV", "PF", "PTS", 
                    "Last Game", "Last Location", "Last Result",
                    "Last MP", "Last PTS", "Last TRB", "Last AST",
                    "Last STL", "Last BLK", "Last FG", "Last 3P", "Last FT",
                    "Last TOV", "Last PF", "Last +/-",
                    "Previous Times All-Star", "Win Percent",
                    "% All Star", "Change", "Unbiased % All Star"]);

            console.log("Leaderboard parsed");
            loadBiasedTable();
        })
    } else {
        loadBiasedTable();
    }

    if(unbiasedLeaderboard == null) {
        fetch('/static/data/unbiased_curr_player.csv').then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            unbiasedLeaderboard = parseCSV(data, 
                ["Name", "Position", "Age", "Team", "Games Played", "Games Started",
                    "MPG", "FGA", "FG%", "3PA", "3P%", "FTA",
                    "FT%", "ORB", "DRB", "AST", "STL", "BLK",
                    "TOV", "PF", "PTS", 
                    "Last Game", "Last Location", "Last Result",
                    "Last MP", "Last PTS", "Last TRB", "Last AST",
                    "Last STL", "Last BLK", "Last FG", "Last 3P", "Last FT",
                    "Last TOV", "Last BLK", "Last +/-",
                    "Previous Times All-Star", "Win Percent",
                    "% All Star", "Change", "Unbiased % All Star", "Daily"]);

            loadUnbiasedTable();
        });
    }
}
function loadBiasedTable() {
    var table = document.getElementById('full-leaderboard').getElementsByTagName('tbody')[0];
    table.innerHTML = '';
    let head = table.insertRow(-1);
    head.id = "table-head";
    head.insertCell(0).innerHTML = "Rank";
    head.insertCell(1).innerHTML = "Daily";
    head.insertCell(2).innerHTML = "Name";
    head.insertCell(3).innerHTML = "Team";
    head.insertCell(4).innerHTML = "Pos.";
    head.insertCell(5).innerHTML = "Age";
    head.insertCell(6).innerHTML = "Prev. All-Star";
    head.insertCell(7).innerHTML = "% All-Star";
    head.insertCell(8).innerHTML = "Unbiased %";

    var size = leaderboard.length;
    var skip = 0;
    for(var i = 0; i < size; i++){
        var player = leaderboard[i];

        if(teamFilters.length > 0 && !teamFilters.includes(player["Team"].toLowerCase())){
            skip++;
            continue;
        }

        var row = table.insertRow(-1);
        row.className = "full-data-row";
        (function(index) {
            row.addEventListener("click", function() {
                toggleDataFull(index);
            });
        })(i - skip);

        var rank = row.insertCell(0);
        rank.innerHTML = "<b>" + (i + 1) + "</b>";
        var change = row.insertCell(1);
        change.innerHTML = player['Change'];
        var name = row.insertCell(2);
        name.innerHTML = player['Name'];
        var team = row.insertCell(3);
        team.innerHTML = player['Team'];
        var pos = row.insertCell(4);
        pos.innerHTML = player['Position'];
        var age = row.insertCell(5);
        age.innerHTML = player['Age'];
        var prev = row.insertCell(6);
        prev.innerHTML = player['Previous Times All-Star'];
        var chance = row.insertCell(7);
        chance.innerHTML = player['% All Star'];
        var chance = row.insertCell(8);
        chance.innerHTML = player['Unbiased % All Star'];

        var stats_row = table.insertRow(-1);
        stats_row.className = "data-full hidden " + player["Team"].toLowerCase() + "_alt";
        var stats = stats_row.insertCell(0);
        stats.colSpan = 9;
        stats.appendChild(createDataDropdown(player));

        var cols = row.getElementsByTagName('td');
        for(var j = 2; j < 9; j++){
            cols[j].classList.add(player["Team"].toLowerCase());
        }

        if(i < 24){
            cols[0].style.backgroundColor = 'gold';
        } else{
            cols[0].style.backgroundColor = 'wheat';
        }
        
        var change = player['Change'].charAt(0);
        if(change == '+'){
            cols[1].style.backgroundColor = 'lightgreen';
        } else if(change == '-'){
            cols[1].style.backgroundColor = 'salmon';
        } else{
            cols[1].style.backgroundColor = 'grey';
        }
    }
}
function loadUnbiasedTable() {
    var table = document.getElementById('unbiased-leaderboard').getElementsByTagName('tbody')[0];
    table.innerHTML = '';
    let head = table.insertRow(-1);
    head.id = "table-head"
    head.insertCell(0).innerHTML = "Rank";
    head.insertCell(1).innerHTML = "Daily";
    head.insertCell(2).innerHTML = "Name";
    head.insertCell(3).innerHTML = "Team";
    head.insertCell(4).innerHTML = "Pos.";
    head.insertCell(5).innerHTML = "Age";
    head.insertCell(6).innerHTML = "Prev. All-Star";
    head.insertCell(7).innerHTML = "Unbiased %";
    head.insertCell(8).innerHTML = "Bias Change";

    var size = unbiasedLeaderboard.length;
    var skip = 0;
    for(var i = 0; i < size; i++){
        var player = unbiasedLeaderboard[i];

        if(teamFilters.length > 0 && !teamFilters.includes(player["Team"].toLowerCase())){
            skip++;
            continue;
        }

        var row = table.insertRow(-1);
        row.className = "full-data-row";
        (function(index) {
            row.addEventListener("click", function() {
                unbiasedToggleDataFull(index);
            });
        })(i - skip);

        var rank = row.insertCell(0);
        rank.innerHTML = "<b>" + (i + 1) + "</b>";
        var daily = row.insertCell(1);
        daily.innerHTML = player['Daily'];
        var name = row.insertCell(2);
        name.innerHTML = player['Name'];
        var team = row.insertCell(3);
        team.innerHTML = player['Team'];
        var pos = row.insertCell(4);
        pos.innerHTML = player['Position'];
        var age = row.insertCell(5);
        age.innerHTML = player['Age'];
        var prev = row.insertCell(6);
        prev.innerHTML = player['Previous Times All-Star'];
        var chance = row.insertCell(7);
        chance.innerHTML = player['Unbiased % All Star'];
        var change = row.insertCell(8);
        change.innerHTML = player['Change'];

        var stats_row = table.insertRow(-1);
        stats_row.className = "unbiased-data-full hidden " + player["Team"].toLowerCase() + "_alt";
        var stats = stats_row.insertCell(0);
        stats.colSpan = 9;
        stats.appendChild(createDataDropdown(player));

        var cols = row.getElementsByTagName('td');
        for(var j = 2; j < 9; j++){
            cols[j].classList.add(player["Team"].toLowerCase())
        }
        cols[6].style.color = "black"; // make grayed out black

        if(i < 24){
            cols[0].style.backgroundColor = 'gold';
        } else{
            cols[0].style.backgroundColor = 'wheat';
        }

        cols[6].style.backgroundColor = 'grey';
        
        var change = player['Daily'].charAt(0);
        if(change == '+'){
            cols[1].style.backgroundColor = 'lightgreen';
        } else if(change == '-'){
            cols[1].style.backgroundColor = 'salmon';
        } else{
            cols[1].style.backgroundColor = 'grey';
        }
        
        var change = player['Change'].charAt(0);
        cols[8].style.color = "black";
        if(change == '+'){
            cols[8].style.backgroundColor = 'lightgreen';
        } else if(change == '-'){
            cols[8].style.backgroundColor = 'salmon';
        } else{
            cols[8].style.backgroundColor = 'grey';
        }
    }
}

// data dropdown stuff
function createDataDropdown(player){
    var parent = document.createElement('div');
    parent.classList.add('dropdown-data-div-parent');

    // create nodes for avgs
    var dataNode = document.createElement('div');
    dataNode.classList.add("dropdown-data-div");
    var container = document.createElement('div'); // games container
    var games = document.createElement('div');
    games.classList.add("dropdown-header");
    games.textContent = player["Games Played"] + " Games Played";
    container.appendChild(games);
    var starts = document.createElement('div');
    starts.classList.add("dropdown-header");
    starts.textContent = player["Games Started"] + " Games Started"; 
    container.appendChild(starts);
    dataNode.appendChild(container);

    dataNode.appendChild(createDropDownCell("Minutes", player["MPG"]));
    dataNode.appendChild(createDropDownCell("PTS", player["PTS"]));
    dataNode.appendChild(createDropDownCell("RBS", String((parseFloat(player["ORB"]) + parseFloat(player["DRB"])).toFixed(1))));
    dataNode.appendChild(createDropDownCell("ORB", player["ORB"]));
    //dataNode.appendChild(createDropDownCell("DRB", player["DRB"]));
    dataNode.appendChild(createDropDownCell("AST", player["AST"]));
    dataNode.appendChild(createDropDownCell("STL", player["STL"]));
    dataNode.appendChild(createDropDownCell("BLK", player["BLK"]));
    dataNode.appendChild(createDropDownCell("FGA", player["FGA"]));
    dataNode.appendChild(createDropDownCell("FG%", (parseFloat(player["FG%"]) * 100.0).toFixed(1)));
    dataNode.appendChild(createDropDownCell("3PA", player["3PA"]));
    dataNode.appendChild(createDropDownCell("3P%", (parseFloat(player["3P%"]) * 100.0).toFixed(1)));
    dataNode.appendChild(createDropDownCell("FTA", player["FTA"]));
    dataNode.appendChild(createDropDownCell("FT%", (parseFloat(player["FT%"]) * 100.0).toFixed(1)));
    dataNode.appendChild(createDropDownCell("TOV", player["TOV"]));
    dataNode.appendChild(createDropDownCell("PF", player["PF"]));
    dataNode.appendChild(createDropDownCell("Team Win %", player["Win Percent"]));

    // create nodes for last game
    var lastGameNode = document.createElement('div');
    lastGameNode.classList.add('dropdown-data-div')
    var date = new Date(player["Last Game"]).toLocaleString("en-us", {day: "numeric", month: "short", year: "numeric"});
    lastGameNode.appendChild(createDropDownCell(date, player["Last Result"] + " " + player["Last Location"]))
    lastGameNode.appendChild(createDropDownCell("Mins", player["Last MP"]))
    lastGameNode.appendChild(createDropDownCell("PTS", player["Last PTS"]))
    lastGameNode.appendChild(createDropDownCell("RB", player["Last TRB"]))
    lastGameNode.appendChild(createDropDownCell("AST", player["Last AST"]))
    lastGameNode.appendChild(createDropDownCell("STL", player["Last STL"]))
    lastGameNode.appendChild(createDropDownCell("BLK", player["Last BLK"]))
    lastGameNode.appendChild(createDropDownCell("FG", player["Last FG"]))
    lastGameNode.appendChild(createDropDownCell("3P", player["Last 3P"]))
    lastGameNode.appendChild(createDropDownCell("FT", player["Last FT"]))
    lastGameNode.appendChild(createDropDownCell("TOV", player["Last TOV"]))
    lastGameNode.appendChild(createDropDownCell("PF", player["Last PF"]))
    lastGameNode.appendChild(createDropDownCell("+/-", player["Last +/-"]))

    parent.appendChild(lastGameNode);
    var divider = document.createElement('div');
    divider.classList.add('divider')
    parent.appendChild(divider);
    parent.appendChild(dataNode);
    return parent;
}
function createDropDownCell(headerLabel, dataLabel){
    var header = document.createElement('div');
    header.textContent = headerLabel;
    header.classList.add("dropdown-header");
    var data = document.createElement('div');
    data.textContent = dataLabel;
    data.classList.add("dropdown-data");
    var cell = document.createElement('div');
    cell.appendChild(header);
    cell.appendChild(data);
    return cell;
}

function toggleData(location, pos){
    var data = null;

    if(location == 'east'){
        data = document.getElementsByClassName('data-east');
    } else if(location == 'west'){
        data = document.getElementsByClassName('data-west');
    } else{
        console.log("toggle data error");
        return;
    }

    data[pos].classList.toggle('hidden');
}
function toggleDataFull(pos){
    var data = document.getElementsByClassName("data-full");
    data[pos].classList.toggle('hidden');
}
function unbiasedToggleDataFull(pos){
    var data = document.getElementsByClassName("unbiased-data-full"); 
    data[pos].classList.toggle('hidden');
}

function toggleFullTableBias(){
    document.getElementById('full-leaderboard').classList.toggle('hidden');
    document.getElementById('unbiased-leaderboard').classList.toggle('hidden');
    
    document.getElementById("bias-checkbox").checked ? loadUnbiasedTable() : loadBiasedTable();
}

// filter data by teams
function addFilterByTeam(team){
    document.getElementById("team-filter-div").getElementsByClassName(team)[0].classList.toggle("off");

    if(!teamFilters.includes(team)){
        teamFilters.push(team);
    } else {
        teamFilters = teamFilters.filter(function(t) {
            return t !== team
        })
    }

    document.getElementById("bias-checkbox").checked ? loadUnbiasedTable() : loadBiasedTable();
}
function clearTeamFilters(){
    teamFilters = [];

    for(teamBox in document.getElementById("team-filter-div").getElementsByTagName("div")){
        if(!teamBox.classList.contains("off")){
            teamBox.classList.add("off");
        }
    }

    document.getElementById("bias-checkbox").checked ? loadUnbiasedTable() : loadBiasedTable();
}


function loadStandings(){
    fetch('/static/data/standings.csv').then(response => {
        if (!response.ok) {
            throw new Error('File not found');
        }
        return response.text();
    })
    .then(data => {
        var standings = parseCSV(data, 
            ["Team", "Wins", "Losses", "Percent", "Games Back",
                "PPG", "OPPG", "SRS", "Games"]);

        var east = document.getElementById("east-standings").getElementsByTagName('tbody')[0];
        var west = document.getElementById("west-standings").getElementsByTagName('tbody')[0]

        for(var i = 0; i < 15; i++){
            var curr = standings[i];
            var row = east.insertRow(-1);

            var rank = row.insertCell(0);
            rank.innerHTML = "<b>" + (i + 1) + "</b>";
            var team = row.insertCell(1);
            team.innerHTML = "<b>" + curr["Team"] + "</b>";
            var wins = row.insertCell(2);
            wins.innerHTML = curr["Wins"];
            var losses = row.insertCell(3);
            losses.innerHTML = curr["Losses"];
            var pct = row.insertCell(4);
            pct.innerHTML = curr["Percent"];
            var gb = row.insertCell(5);
            gb.innerHTML = curr["Games Back"];
            var ppg = row.insertCell(6);
            ppg.innerHTML = curr["PPG"]
            var oppg = row.insertCell(7);
            oppg.innerHTML = curr["OPPG"]
            var srs = row.insertCell(8);
            srs.innerHTML = curr["SRS"];
            var games = row.insertCell(9);
            games.innerHTML = curr["Games"];

            var cols = row.getElementsByTagName('td');
            for(var j = 1; j < 10; j++){
                cols[j].classList.add(curr["Team"].toLowerCase());
            }

            if(i < 6){
                cols[0].style.backgroundColor = 'wheat';
            } else if(i < 10){
                cols[0].style.backgroundColor = 'lightgrey';
            } else{
                cols[0].style.backgroundColor = 'grey';
            }
        }

        for(var i = 15; i < 30; i++){
            var curr = standings[i];
            var color = '';

            var row = west.insertRow(-1);

            var rank = row.insertCell(0);
            rank.innerHTML = "<b>" + (i - 14) + "</b>";
            var team = row.insertCell(1);
            team.innerHTML = "<b>" + curr["Team"] + "</b>";
            var wins = row.insertCell(2);
            wins.innerHTML = curr["Wins"];
            var losses = row.insertCell(3);
            losses.innerHTML = curr["Losses"];
            var pct = row.insertCell(4);
            pct.innerHTML = curr["Percent"];
            var gb = row.insertCell(5);
            gb.innerHTML = curr["Games Back"];
            var ppg = row.insertCell(6);
            ppg.innerHTML = curr["PPG"]
            var oppg = row.insertCell(7);
            oppg.innerHTML = curr["OPPG"]
            var srs = row.insertCell(8);
            srs.innerHTML = curr["SRS"];
            var games = row.insertCell(9);
            games.innerHTML = curr["Games"];

            var cols = row.getElementsByTagName('td');
            for(var j = 1; j < 10; j++){
                cols[j].classList.add(curr["Team"].toLowerCase());
            }

            if(i - 15 < 6){
                cols[0].style.backgroundColor = 'wheat';
            } else if(i - 15 < 10){
                cols[0].style.backgroundColor = 'lightgrey';
            } else{
                cols[0].style.backgroundColor = 'grey';
            }
        }
    })

    return;
}


// close dropdown if not clicking on it 
window.onclick = function(event) {
    var dropdown = document.getElementById('search-dropdown');

    if(dropdown == null){
        return;
    }

    if (event.target !== document.getElementById('search-input') && !event.target.closest('.search-container')) {
      dropdown.style.display = 'none';
    }
};