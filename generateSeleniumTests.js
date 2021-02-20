const testTemplate = require('./wrs-calculator.side.json');
const csv = require('csvtojson')
const fsPromises = require("fs").promises;
const uuid = require('uuid').v4;
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/*
1) load up the template // wrs-calculator.side.json
2) add the store values // generatedTest.side
3) concatenate the expected values
*/

const inputColumns = [
    "name",
    "birthDate",
    "retireDate",
    "survivorRetireDate",
    "survivorSpouse",
    "socialSecurityAt62",
    "generalBefore2000","generalAfter1999",
    "protectiveWithSocBefore2000","protectiveWithSocAfter1999",
    "protectiveNoSocBefore2000","protectivNoSocAfter1999",
    "electedBefore2000","electedAfter1999","electedAfterAct10",
    "terminateBefore2000",
    "yearOneHighestEarnings","yearOneService",
    "yearTwoHighestEarnings","yearTwoService",
    "yearThreeHighestEarnings","yearThreeService",
    "variableDifferenceAmount",
    "variableDifferenceType",
    "employeeAdditionalContribution","employerAdditionalContribution",
    "moneyPurchaseBalance"
];

const outputColumns = [
    'AnnuitantsLifeOnlyReg',
    'AnnuitantsLifeOnlyAccUntil62',
    'AnnuitantsLifeOnlyAccAfter62',
    'AnnuitantsLifeOnlyAddCont',
    'SixtyPaymentsReg',
    'SixtyPaymentsAccUntil62',
    'SixtyPaymentsAccAfter62',
    'SixtyPaymentsAddCont',
    'OneEightyPaymentsGuaranteedReg',
    'OneEightyPaymentsGuaranteedAccUntil62',
    'OneEightyPaymentsGuaranteedAccAfter62',
    'OneEightyPaymentsGuaranteedAddCont',
    'Survivor75Reg',
    'Survivor75AccUntil62',
    'Survivor75AccAfter62',
    'Survivor75AddCont',
    'Survivor100Reg',
    'Survivor100AccUntil62',
    'Survivor100AccAfter62',
    'Survivor100AddCont',
    'Reduce25DeathReg',
    'Reduce25DeathAccUntil62',
    'Reduce25DeathAccAfter62',
    'Reduce25DeathAddCont',
    'Survivor100WithGuaranteeReg',
    'Survivor100WithGuaranteeAccUntil62',
    'Survivor100WithGuaranteeAccAfter62',
    'Survivor100WithGuaranteeAddCont',
    'AddContributions24Months',
    'AddContributions60Months',
    'AddContributions120Months',
    'AddContributionsLumpSum',
];

const radioColumns = ["survivorSpouse","terminateBefore2000", "variableDifferenceType"];
const storeTemplate = {
    "id": "",
    "comment": "",
    "command": "store",
    "target": "", // value
    "targets": [],
    "value": "" // variable name
};

readCSVData = async (filePath) => {
    const data = await csv().fromFile(filePath);
    return data;
}

function makeTest(row) {
    const storeVars = [];
    // console.log(row);
    for (const col in row) {
        if(inputColumns.includes(col)) {
            storeVars.push ({
                ...storeTemplate,
                id: uuid(),
                target: row[col],
                value: col
            });
        }
    }
    return storeVars;
}

  // Start function
  const start = async function(a, b) {
    const data = await readCSVData('./test-data.csv');
    const divider = '|||';
    const completedTests = [];
    for (const row in data) {
        const thisTest = JSON.parse(JSON.stringify(testTemplate));

        // with each test data make a set of steps to store the data, and add it to the side
        const storeVars = makeTest(data[row]);
        thisTest.tests[0].commands.splice(1,0,...storeVars);

        // then take all the output values, and jam them into a single result
        const resultsIndex = thisTest.tests[0].commands.findIndex(element => element.comment === 'combinedActualResults');
        const outputValues = outputColumns.map(el => `\$\{${el}\}` ).join(divider);
        thisTest.tests[0].commands[resultsIndex].value = outputValues;

        // then write out that test so that it can be executed
        const sideTest = `generatedTest.${row}.${uuid()}.side`;
        await fsPromises.writeFile(sideTest, JSON.stringify(thisTest), {encoding:'utf8',flag:'w'});

        // then run the tests, and grab the correct values from the failed test
        const outputDir = `results/${uuid()}`;
        const outputFile = `./${outputDir}/wrs-calculator.json`;
        await fsPromises.mkdir(outputDir);
        const command = `selenium-side-runner -c "goog:chromeOptions.args=[--headless,--nogpu] browserName=chrome" --output-directory=${outputDir} ${sideTest}`;
        try {
            const { stdout, stderr } = await exec(command);    
        } catch (e) { /* expected failure */ }

        const testResultsStr = await fsPromises.readFile(outputFile);

        // clean up the temp files
        await fsPromises.unlink(sideTest);
        await fsPromises.unlink(outputFile);
        await fsPromises.rmdir(outputDir, { recursive: true });

        const testResults = JSON.parse(Buffer.from(testResultsStr).toString());
        // hard-code in the first test, first assertion, first failure
        const failureMessage = testResults.testResults[0].assertionResults[0].failureMessages[0];
        const findVals = new RegExp(/Expected value to be \(using Object\.is\):\s*"(.*)"\s*Received/,'gm');
        const regExResults = findVals.exec(failureMessage);
        if( regExResults === null ) {
            console.log(failureMessage);
            throw Error('couldnt find expected failure');
        }
        const correctValues = regExResults[1].split(divider);

        // re-map them back to the original values by index
        const actualValues = outputColumns.reduce((obj, key, index) => ({ ...obj, [key]: correctValues[index] }), {});

        completedTests.push ({
            data: data[row],
            results: actualValues
        });
    }

    // finally with the actual results, put them into a JSON file for use in wrs-calculator
    await fsPromises.writeFile(
        'seleniumTestResults.json', 
        JSON.stringify(completedTests), 
        {encoding: 'utf8', flag: 'w'}
    );
    
  }
  
  // Call start
  start();
