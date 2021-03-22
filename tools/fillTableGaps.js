var table75 = require ('../tables/100-percent-survivor-bad.json');
var filledIn = {};
var prev;
for (var row in table75) {
    if (prev) {
        const newRow = avgObject([table75[prev], table75[row]]);
        filledIn[row-1] = newRow;
    }
    filledIn[row] = table75[row];
    prev = row;
}

console.log(JSON.stringify(filledIn,undefined,4));

function avgObject( data ) {
    const factor = 1000;
    const result = {};
    data.forEach(resultSet => {
        for (let [key, value] of Object.entries(resultSet)) {
            if (result[key]) {
                var calc = ((value * factor) + (result[key]*factor));
                calc += (calc % 2 == 0) ? 0 :1;
                calc = calc/2/factor
                result[key] = calc;
            } else {
                result[key] = value;
            }
        }
    });
    return result;
};
