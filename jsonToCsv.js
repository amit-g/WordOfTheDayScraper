var fs = require('fs');
var _ = require('lodash');

var inputFileName = 'output.json';
var outputFileName = 'output.csv';

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
    return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
  }).replace(/\s+/g, '');
}

fs.readFile(inputFileName, function (err, data) {
    var outputFile = fs.createWriteStream(outputFileName);
    outputFile.on('error', function (err){
        console.log("Error writing file:");
        console.log(err);
    });

    //var output = [];
    var headers = ["Company Name", "Category", "Contact Name", "Address", "City", "State", "Zip", "Website", "Phone", "Fax"];

    var columns = _.map(headers, function(col) {
        return camelize(col);
    });

    var line = '"' + headers.join('","') + '"';

    //output.push(line);
    outputFile.write(line + '\n');

    var contacts = JSON.parse(data);

    //console.log(contacts);

    contacts.forEach(function(contact) {
        var values = _.map(columns, function(col){
            return contact[col];
        });

        var line = '"' + values.join('","') + '"';

        //output.push(line);
        outputFile.write(line + '\n');
    }, this);

    outputFile.end();

    console.log('File successfully written! - Check your project directory for the ' + outputFileName);
});