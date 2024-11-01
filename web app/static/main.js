// for these data files, we should only require one fetch per session
var currPlayers = null;

// Function for parsing a form to be submitted to the predictor
function submitData() {  
    var form = document.getElementById("inputform");
    var data = new FormData(form)
    console.log(data.get("name"))
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
    if(currPlayers == null){
        fetch('/static/data/curr_player.csv').then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            var currPlayers = parseCSV(data, ["", "Name"]);
            var matching = matchCurrentText(currPlayers);
    
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
                  matchCurrentText(dataArray);
                };
                dropdown.appendChild(div);
            });
    
            dropdown.style.display = matching.length > 0 ? 'block' : 'none';
        })
        .catch(error => console.error('Fetch error:', error));
    } else {
        var matching = matchCurrentText(currPlayers);
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
                matchCurrentText(dataArray);
            };
            dropdown.appendChild(div);
        });

        dropdown.style.display = matching.length > 0 ? 'block' : 'none';
    }
}
// Fills out form on search submission (and auto submits form)
function searchGetData() {
    if(currPlayerFile == null) {
        fetch('/static/data/curr_player.csv').then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            var currPlayers = parseCSV(data, ["", "Name"]);
            var matching = matchCurrentText(currPlayers);

            var player_index = parseInt(document.getElementById("search_input").dataset.playerIndex);
            if(isNaN(player_index) || player_index < 0){
                console.log("Parse Int Error");
                alert("Player not found.");
                return false;
            } else{
                document.getElementById('search_input').value = matching[0];
                document.getElementById('search-dropdown').style.display = 'none';
            }

            var dataArray = parseCSV(data, ["Games Played", "Games Started", "MPG",
                "FG", "FGA", "3P", "3PA", "FT", "FTA", "ORB", "DRB", "AST", "STL",
                "BLK", "TOV", "Previous Times All-Star", "Win Percent", "% All Star"]);

            var dataLabels = ["Games Played", "Games Started", "MPG",
                "FG", "FGA", "3P", "3PA", "FT", "FTA", "ORB", "DRB", "AST", "STL",
                "BLK", "TOV", "Previous Times All-Star", "Win Percent", "% All Star"];

            var slice = dataArray[player_index];
            console.log("Data: " + slice);

            var form = new FormData(document.getElementById('inputform'));
            var formKeys = [];

            for(var[key, value] of form){
                formKeys.push(key);
            }

            for(var i = 0; i < formKeys.length; i++){
                document.querySelector("[name='" + formKeys[i] + "']").value = slice[dataLabels[i]];
            }

            submitData();
        })
        .catch(error => console.error('Fetch error:', error));
    } else {
        var matching = matchCurrentText(currPlayers);
        var player_index = parseInt(document.getElementById("search_input").dataset.playerIndex);

        if(isNaN(player_index) || player_index < 0){
            console.log("Parse Int Error");
            alert("Player not found.");
            return false;
        } else{
            document.getElementById('search_input').value = matching[0];
            document.getElementById('search-dropdown').style.display = 'none';
        }

        var dataArray = parseCSV(data, ["Games Played", "Games Started", "MPG",
            "FG", "FGA", "3P", "3PA", "FT", "FTA", "ORB", "DRB", "AST", "STL",
            "BLK", "TOV", "Previous Times All-Star", "Win Percent", "% All Star"]);

        var dataLabels = ["Games Played", "Games Started", "MPG",
            "FG", "FGA", "3P", "3PA", "FT", "FTA", "ORB", "DRB", "AST", "STL",
            "BLK", "TOV", "Previous Times All-Star", "Win Percent", "% All Star"];

        var slice = dataArray[player_index];
        console.log("Data: " + slice);

        var form = new FormData(document.getElementById('inputform'));
        var formKeys = [];

        for(var[key, value] of form){
            formKeys.push(key);
        }

        for(var i = 0; i < formKeys.length; i++){
            document.querySelector("[name='" + formKeys[i] + "']").value = slice[dataLabels[i]];
        }

        submitData();
    }
    
    return false;
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
            "TOV", "PF", "PTS", "Previous Times All-Star", "Win Percent",
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

            var dataString = "\n" + player["Games Played"] + " games played    -    " + 
                player["Games Started"] + " games started    -    " +
                player["MPG"] + " mpg\n\n" + player["PTS"] + " ppg    -    " + 
                String((parseFloat(player["ORB"]) + parseFloat(player["DRB"])).toFixed(1)) + " rbp    -    " + 
                player["AST"] + " apg    -    " + player["STL"] + " spg    -    " +
                player["BLK"] + " bpg\n\n" + (parseFloat(player["FG%"]) * 100.0).toFixed(1) + " fg%    -    " + 
                (parseFloat(player["3P%"]) * 100.0).toFixed(1) + " 3p%    -    " + (parseFloat(player["FT%"]) * 100.0).toFixed(1) + " ft%    -    " +
                player["FGA"] + " fga    -    " + player["3PA"] + " 3pa    -    " +
                player["FTA"] + " fta\n\n" + player["ORB"] + " orpg    -    " +
                player["DRB"] + " drpg    -    " + player["TOV"] + " tpg    -    " +
                player["PF"] + " fpg   -   " + player["Win Percent"] + " win ratio\n\n";

            cols[0].innerHTML = "<b>" + (i + 1) + "</b>";
            cols[1].innerHTML = player['Change'];
            cols[2].innerHTML = player['Name'];
            cols[3].innerHTML = player['Team'];
            cols[4].innerHTML = player['Position'];
            cols[5].innerHTML = player['Age'];
            cols[6].innerHTML = player['Previous Times All-Star'];
            cols[7].innerHTML = player['% All Star'];

            stats[i].getElementsByTagName('td')[0].innerHTML = dataString;
            stats[i].classList.add(player["Team"].toLowerCase() + "_alt");

            if(front + back + wild < 12){
                if(player['Position'].charAt(1) == 'G'){
                    if(front < 2){
                        temp = lineup[0].getElementsByTagName('td')[front];
                        front++;
                    } else if(front < 4){
                        temp = lineup[1].getElementsByTagName('td')[front - 2];
                        front++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                    }
                } else{
                    if(back < 3){
                        temp = lineup[0].getElementsByTagName('td')[back + 2];
                        back++;
                    } else if(back < 6){
                        temp = lineup[1].getElementsByTagName('td')[back - 1];
                        back++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                    }
                }
                temp.innerHTML = player['Name'];
                temp.classList.add(player["Team"].toLowerCase());
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
            "TOV", "PF", "PTS", "Previous Times All-Star", "Win Percent",
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

            var dataString = "\n" + player["Games Played"] + " games played    -    " + 
                player["Games Started"] + " games started    -    " +
                player["MPG"] + " mpg\n\n" + player["PTS"] + " ppg    -    " + 
                String((parseFloat(player["ORB"]) + parseFloat(player["DRB"])).toFixed(1)) + " rbp    -    " + 
                player["AST"] + " apg    -    " + player["STL"] + " spg    -    " +
                player["BLK"] + " bpg\n\n" + (parseFloat(player["FG%"]) * 100.0).toFixed(1) + " fg%    -    " + 
                (parseFloat(player["3P%"]) * 100.0).toFixed(1) + " 3p%    -    " + (parseFloat(player["FT%"]) * 100.0).toFixed(1) + " ft%    -    " +
                player["FGA"] + " fga    -    " + player["3PA"] + " 3pa    -    " +
                player["FTA"] + " fta\n\n" + player["ORB"] + " orpg    -    " +
                player["DRB"] + " drpg    -    " + player["TOV"] + " tpg    -    " +
                player["PF"] + " fpg   -   " + player["Win Percent"] + " win ratio\n\n";

            cols[0].innerHTML = "<b>" + (i + 1) + "</b>";
            cols[1].innerHTML = player['Change'];
            cols[2].innerHTML = player['Name'];
            cols[3].innerHTML = player['Team'];
            cols[4].innerHTML = player['Position'];
            cols[5].innerHTML = player['Age'];
            cols[6].innerHTML = player['Previous Times All-Star'];
            cols[7].innerHTML = player['% All Star'];

            stats[i].getElementsByTagName('td')[0].innerHTML = dataString;
            stats[i].classList.add(player["Team"].toLowerCase() + "_alt");
            if(front + back + wild < 12){
                if(player['Position'].charAt(1) == 'G'){
                    if(front < 2){
                        temp = lineup[0].getElementsByTagName('td')[front];
                        front++;
                    } else if(front < 4){
                        temp = lineup[1].getElementsByTagName('td')[front - 2];
                        front++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                    }
                } else{
                    if(back < 3){
                        temp = lineup[0].getElementsByTagName('td')[back + 2];
                        back++;
                    } else if(back < 6){
                        temp = lineup[1].getElementsByTagName('td')[back - 1];
                        back++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        wild++;
                    }
                }
                temp.innerHTML = player['Name'];
                temp.classList.add(player["Team"].toLowerCase());
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
    // Update western conference
    fetch('/static/data/curr_player.csv').then(response => {
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
            "TOV", "PF", "PTS", "Previous Times All-Star", "Win Percent",
            "% All Star", "Change", "Unbiased % All Star"]);

        var table = document.getElementById('full-leaderboard').getElementsByTagName('tbody')[0];
        var size = leaderboard.length;

        for(var i = 0; i < size; i++){
            var player = leaderboard[i];
            var color = '';

            var dataString = "\n" + player["Games Played"] + " games played    -    " + 
                player["Games Started"] + " games started    -    " +
                player["MPG"] + " mpg\n\n" + player["PTS"] + " ppg    -    " + 
                String((parseFloat(player["ORB"]) + parseFloat(player["DRB"])).toFixed(1)) + " rbp    -    " + 
                player["AST"] + " apg    -    " + player["STL"] + " spg    -    " +
                player["BLK"] + " bpg\n\n" + (parseFloat(player["FG%"]) * 100.0).toFixed(1) + " fg%    -    " + 
                (parseFloat(player["3P%"]) * 100.0).toFixed(1) + " 3p%    -    " + (parseFloat(player["FT%"]) * 100.0).toFixed(1) + " ft%    -    " +
                player["FGA"] + " fga    -    " + player["3PA"] + " 3pa    -    " +
                player["FTA"] + " fta\n\n" + player["ORB"] + " orpg    -    " +
                player["DRB"] + " drpg    -    " + player["TOV"] + " tpg    -    " +
                player["PF"] + " fpg   -   " + player["Win Percent"] + " win ratio\n\n";

            var row = table.insertRow(-1);
            row.className = "full-data-row";
            (function(index) {
                row.addEventListener("click", function() {
                    toggleDataFull(index);
                });
            })(i);

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
            stats_row.className = "data-full hidden";
            var stats = stats_row.insertCell(0);
            stats.colSpan = 9;
            stats.innerHTML = dataString;

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

        document.getElementById('full-leaderboard').classList.toggle('hidden');
    })

    fetch('/static/data/unbiased_curr_player.csv').then(response => {
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
            "TOV", "PF", "PTS", "Previous Times All-Star", "Win Percent",
            "% All Star", "Change", "Unbiased % All Star", "Daily"]);

        var table = document.getElementById('unbiased-leaderboard').getElementsByTagName('tbody')[0];
        var size = leaderboard.length;

        for(var i = 0; i < size; i++){
            var player = leaderboard[i];
            var color = '';

            var dataString = "\n" + player["Games Played"] + " games played    -    " + 
                player["Games Started"] + " games started    -    " +
                player["MPG"] + " mpg\n\n" + player["PTS"] + " ppg    -    " + 
                String((parseFloat(player["ORB"]) + parseFloat(player["DRB"])).toFixed(1)) + " rbp    -    " + 
                player["AST"] + " apg    -    " + player["STL"] + " spg    -    " +
                player["BLK"] + " bpg\n\n" + (parseFloat(player["FG%"]) * 100.0).toFixed(1) + " fg%    -    " + 
                (parseFloat(player["3P%"]) * 100.0).toFixed(1) + " 3p%    -    " + (parseFloat(player["FT%"]) * 100.0).toFixed(1) + " ft%    -    " +
                player["FGA"] + " fga    -    " + player["3PA"] + " 3pa    -    " +
                player["FTA"] + " fta\n\n" + player["ORB"] + " orpg    -    " +
                player["DRB"] + " drpg    -    " + player["TOV"] + " tpg    -    " +
                player["PF"] + " fpg   -   " + player["Win Percent"] + " win ratio\n\n";

            var row = table.insertRow(-1);
            row.className = "full-data-row";
            (function(index) {
                row.addEventListener("click", function() {
                    unbiasedToggleDataFull(index);
                });
            })(i);

            var rank = row.insertCell(0);
            rank.innerHTML = i + 1;
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
            stats_row.className = "unbiased-data-full hidden";
            var stats = stats_row.insertCell(0);
            stats.colSpan = 9;
            stats.innerHTML = dataString;

            switch(player["Team"]){
                case "BOS":
                    color = "#50D952";
                    break;
                case "MIL":
                    color = "#33A264";
                    break;
                case "PHI":
                    color = "#7B80FE";
                    break;
                case "ATL":
                    color = "#D9907F";
                    break;
                case "IND":
                    color = "#CFE937";
                    break;
                case "NYK":
                    color = "#F9A041";
                    break;
                case "MIA":
                    color = "#FD4176";
                    break;
                case "CLE":
                    color = "#B83535";
                    break;
                case "CHI":
                    color = "FF0000";
                    break;
                case "TOR":
                    color = "#F44244";
                    break;
                case "ORL":
                    color = "#5BAAE4";
                    break;
                case "BRK":
                    color = "#848484";
                    break;
                case "CHO":
                    color = "#63A7D9";
                    break;
                case "DET":
                    color = "#D76466";
                    break;
                case "WAS":
                    color = "#E775CD";
                    break;
                case "DAL":
                    color = "#5281DB";
                    break;
                case "DEN":
                    color = "#ECE16A";
                    break;
                case "GSW":
                    color = "#8985FF";
                    break;
                case "HOU":
                    color = "#F35151";
                    break;
                case "LAC":
                    color = "#FBFBFB";
                    break;
                case "LAL":
                    color = "#FEFF4F";
                    break;
                case "MEM":
                    color = "#838EC2";
                    break;
                case "MIN":
                    color = "#8585BF";
                    break;
                case "NOP":
                    color = "#DBF5A2";
                    break;
                case "OKC":
                    color = "#DDF5FF";
                    break;
                case "PHO":
                    color = "#FCBC4D";
                    break;
                case "POR":
                    color = "#DF8573";
                    break;
                case "SAC":
                    color = "#A479E8";
                    break;
                case "SAS":
                    color = "#AFAFAF";
                    break;
                case "UTA":
                    color = "#A48BBB";
                    break;
                case "DAL":
                    color = "#5281DB";
                    break;
                case "DEN":
                    color = "#ECE16A";
                    break;
                case "GSW":
                    color = "#8985FF";
                    break;
                case "HOU":
                    color = "#F35151";
                    break;
                case "LAC":
                    color = "#FBFBFB";
                    break;
                case "LAL":
                    color = "#FEFF4F";
                    break;
                case "MEM":
                    color = "#838EC2";
                    break;
                case "MIN":
                    color = "#8585BF";
                    break;
                case "NOP":
                    color = "#DBF5A2";
                    break;
                case "OKC":
                    color = "#DDF5FF";
                    break;
                case "PHO":
                    color = "#FCBC4D";
                    break;
                case "POR":
                    color = "#DF8573";
                    break;
                case "SAC":
                    color = "#A479E8";
                    break;
                case "SAS":
                    color = "#AFAFAF";
                    break;
                case "UTA":
                    color = "#A48BBB";
                    break;
            }

            var bigint = parseInt(color.slice(1), 16);
            var red = (bigint >> 16) & 255;
            var green = (bigint >> 8) & 255;
            var blue = bigint & 255;
            stats_row.style.backgroundColor = 'rgba(' + red + ',' + green + ',' + blue + ',0.5)';

            var cols = row.getElementsByTagName('td');
            for(var j = 2; j < 9; j++){
                cols[j].style.backgroundColor = color;
            }

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
            if(change == '+'){
                cols[8].style.backgroundColor = 'lightgreen';
            } else if(change == '-'){
                cols[8].style.backgroundColor = 'salmon';
            } else{
                cols[8].style.backgroundColor = 'grey';
            }
        }
    })

    return;
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
            team.innerHTML = curr["Team"];
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
            team.innerHTML = curr["Team"];
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