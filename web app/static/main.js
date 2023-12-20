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
        }, 
        error: function(error) { 
            console.log(error); 
        } 
    }); 
}

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
        
        console.log("Data in JavaScript format:", matching);

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


// close dropdown if not clicking on it 
window.onclick = function(event) {
    var dropdown = document.getElementById('search-dropdown');
    if (event.target !== document.getElementById('search-input') && !event.target.closest('.search-container')) {
      dropdown.style.display = 'none';
    }
  };