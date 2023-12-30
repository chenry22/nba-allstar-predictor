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
    fetch('/static/data/curr_player.csv').then(response => {
        if (!response.ok) {
            throw new Error('File not found');
        }
        return response.text();
    })
    .then(data => {
        var dataArray = parseCSV(data, ["", "Name"]);
        var matching = matchCurrentText(dataArray);

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
}

// Fills out form on search submission (and auto submits form)
function searchGetData() {
    fetch('/static/data/curr_player.csv').then(response => {
        if (!response.ok) {
            throw new Error('File not found');
        }
        return response.text();
    })
    .then(data => {
        var indexCheck = parseCSV(data, ["", "Name"]);
        var matching = matchCurrentText(indexCheck);

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

        console.log("Finished data parsing of player");
        submitData();
    })
    .catch(error => console.error('Fetch error:', error));

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

    console.log(input);

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
    // Update western conference
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
            var color = '';

            var dataString = "\n" + player["Games Played"] + " games played    -    " + 
                player["Games Started"] + " games started    -    " +
                player["MPG"] + " mpg\n\n" + player["PTS"] + " ppg    -    " + 
                String((parseFloat(player["ORB"]) + parseFloat(player["DRB"])).toFixed(1)) + " rbp    -    " + 
                player["AST"] + " apg    -    " + player["STL"] + " spg    -    " +
                player["BLK"] + " bpg\n\n" + parseFloat(player["FG%"]).toFixed(2) + " fg%    -    " + 
                parseFloat(player["3P%"]).toFixed(2) + " 3p%    -    " + parseFloat(player["FT%"]).toFixed(2) + " ft%    -    " +
                player["FGA"] + " fga    -    " + player["3PA"] + " 3pa    -    " +
                player["FTA"] + " fta\n\n" + player["ORB"] + " orpg    -    " +
                player["DRB"] + " drpg    -    " + player["TOV"] + " tpg    -    " +
                player["PF"] + " fpg\n\n";

            cols[0].innerHTML = i + 1;
            cols[1].innerHTML = player['Change'];
            cols[2].innerHTML = player['Name'];
            cols[3].innerHTML = player['Team'];
            cols[4].innerHTML = player['Position'];
            cols[5].innerHTML = player['Age'];
            cols[6].innerHTML = player['Previous Times All-Star'];
            cols[7].innerHTML = player['% All Star'];

            stats[i].getElementsByTagName('td')[0].innerHTML = dataString;

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
            }

            // hex color converter
            var bigint = parseInt(color.slice(1), 16);
            var red = (bigint >> 16) & 255;
            var green = (bigint >> 8) & 255;
            var blue = bigint & 255;
            stats[i].style.backgroundColor = 'rgba(' + red + ',' + green + ',' + blue + ',0.5)';

            if(front + back + wild < 12){
                if(player['Position'].charAt(1) == 'G'){
                    if(front < 2){
                        temp = lineup[0].getElementsByTagName('td')[front];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        front++;
                    } else if(front < 4){
                        temp = lineup[1].getElementsByTagName('td')[front - 2];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        front++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        wild++;
                    }
                } else{
                    if(back < 3){
                        temp = lineup[0].getElementsByTagName('td')[back + 2];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        back++;
                    } else if(back < 6){
                        temp = lineup[1].getElementsByTagName('td')[back - 1];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        back++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        wild++;
                    }
                }
            }

            for(var j = 2; j < 8; j++){
                cols[j].style.backgroundColor = color;
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
            var color = "";

            var dataString = "\n" + player["Games Played"] + " games played    -    " + 
                player["Games Started"] + " games started    -    " +
                player["MPG"] + " mpg\n\n" + player["PTS"] + " ppg    -    " + 
                String((parseFloat(player["ORB"]) + parseFloat(player["DRB"])).toFixed(1)) + " rbp    -    " + 
                player["AST"] + " apg    -    " + player["STL"] + " spg    -    " +
                player["BLK"] + " bpg\n\n" + parseFloat(player["FG%"]).toFixed(2) + " fg%    -    " + 
                parseFloat(player["3P%"]).toFixed(2) + " 3p%    -    " + parseFloat(player["FT%"]).toFixed(2) + " ft%    -    " +
                player["FGA"] + " fga    -    " + player["3PA"] + " 3pa    -    " +
                player["FTA"] + " fta\n\n" + player["ORB"] + " orpg    -    " +
                player["DRB"] + " drpg    -    " + player["TOV"] + " tpg    -    " +
                player["PF"] + " fpg\n\n";

            cols[0].innerHTML = i + 1;
            cols[1].innerHTML = player['Change'];
            cols[2].innerHTML = player['Name'];
            cols[3].innerHTML = player['Team'];
            cols[4].innerHTML = player['Position'];
            cols[5].innerHTML = player['Age'];
            cols[6].innerHTML = player['Previous Times All-Star'];
            cols[7].innerHTML = player['% All Star'];

            stats[i].getElementsByTagName('td')[0].innerHTML = dataString;

            switch(player["Team"]){
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
            stats[i].style.backgroundColor = 'rgba(' + red + ',' + green + ',' + blue + ',0.5)';

            if(front + back + wild < 12){
                if(player['Position'].charAt(1) == 'G'){
                    if(front < 2){
                        temp = lineup[0].getElementsByTagName('td')[front];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        front++;
                    } else if(front < 4){
                        temp = lineup[1].getElementsByTagName('td')[front - 2];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        front++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        wild++;
                    }
                } else{
                    if(back < 3){
                        temp = lineup[0].getElementsByTagName('td')[back + 2];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        back++;
                    } else if(back < 6){
                        temp = lineup[1].getElementsByTagName('td')[back - 1];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        back++;
                    } else if(wild < 2){
                        temp = lineup[2].getElementsByTagName('td')[wild];
                        temp.innerHTML = player['Name'];
                        temp.style.backgroundColor = color;
                        wild++;
                    }
                }
            }

            for(var j = 2; j < 8; j++){
                cols[j].style.backgroundColor = color;
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