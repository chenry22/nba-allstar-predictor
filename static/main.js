function submitData() {  
    var form = document.getElementById("inputform");
    var data = new FormData(form)
    var inputArray = new Array();

    for (var[key, value] of data){
        if(value < 0){
            alert("Negative values are not valid.");
            return false;
        }

        if((key == "gplayed" || key == "gstarted") && value > 82){
            alert("Maximum games is 82")
            return false;
        }

        if (!value){
            inputArray.push(0)
        } else{
            inputArray.push(parseFloat(value))
        }

        if((key == "fgapg") && (inputArray[3] > inputArray[4])){
            alert("Cannot have more FG than FGA.");
            return false;
        }

        if(key == "3papg"){
            if(inputArray[5] > inputArray[6]){
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

        if((key == "ftapg" )&& (inputArray[9] > inputArray[10])){
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
                alert("Win % cannot be greater than 1.0");
                return false;
            }

            if(inputArray[4] > 0){
                inputArray.push(inputArray[17] / inputArray[4])
            } else{
                inputArray.push(inputArray[4]);
            }
        }
    }

    for(var i = 0; i < inputArray.length; i++){
        inputArray[i] = Math.round(inputArray[i] * 100) / 100;
    };

    var row1 = document.getElementById("show_vals_1").getElementsByTagName('td');
    var row2 = document.getElementById("show_vals_2").getElementsByTagName('td');

    for(var i = 0; i < row1.length; i++){
        row1[i].innerHTML = inputArray[i];
        row2[i].innerHTML = inputArray[i + row1.length];
    }

    return false;
}