var Calculator = require ('./index');
var expect = require('chai').expect;
var glob = require( 'glob' );

describe ('#calculate()', function() {
    glob.sync( './test-data/**/*.json' ).forEach( function( file ) {
        var tests = require(file);
        for(const i in tests) {
            describe('#calculate()', testRow.bind(null, file, tests[i]));
        }
    });
});

function testRow (testFile, testData) {
    let ex = transformTest(testData.data);
    let calc = Calculator(ex);
    if( calc.getMinimumRetirementAge(ex.salary) > ex.withdrawalAge ) {
        // We have to do this test first because SeIDE returns values for
        // ages less than min retirement age for some reason
        expect(() => calc.calculate()).to.throw('Minimum retirement age not reached');

    } else if( testData.results.AnnuitantsLifeOnlyReg === 'ERROR' ) {

        // If SeIDE throws an exception that's not about age, we're currently not trapping it.
        it(`should pass generated test: ERROR`, function() {
            expect(() => calc.calculate()).to.throw('asdf');
        });

    } else {

        // Otherwise use the results of the SeIDE test run
        let expectedMonthly = Number(testData.results.AnnuitantsLifeOnlyReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedGuaranteed60 = Number(testData.results.SixtyPaymentsReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedGuaranteed180 = Number(testData.results.OneEightyPaymentsGuaranteedReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedSurvivor75 = Number(testData.results.Survivor75Reg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedSurvivor100 = Number(testData.results.Survivor100Reg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedSurvivor100Plus = Number(testData.results.Survivor100WithGuaranteeReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedSurvivor25Red = Number(testData.results.Reduce25DeathReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedOptional = Number(testData.results.AnnuitantsLifeOnlyAddCont.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedAcceleratedAfter62 = Number(testData.results.AnnuitantsLifeOnlyAccAfter62.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedAcceleratedUntil62 = Number(testData.results.AnnuitantsLifeOnlyAccUntil62.replace(/[^0-9.-]+/g,"")).toFixed(2);

        it(`${testFile}: ${ex.name}`, function(){
            expect(calc.calculate().regular.annuitantsLife.toFixed(2)).to.equal(expectedMonthly, `pension test`);
            expect(calc.calculate().regular.guaranteed60.toFixed(2)).to.equal(expectedGuaranteed60, `guaranteed 60 test`);
            expect(calc.calculate().regular.guaranteed180.toFixed(2)).to.equal(expectedGuaranteed180, `guaranteed 180 test`);
            expect(calc.calculate().regular.survivor75.toFixed(2)).to.equal(expectedSurvivor75, `survivor 75% test`);
            expect(calc.calculate().regular.survivor100.toFixed(2)).to.equal(expectedSurvivor100, `survivor 100% test`);
            expect(calc.calculate().regular.survivor100with180.toFixed(2)).to.equal(expectedSurvivor100Plus, `survivor 100% plus guartanteed test`);
            expect(calc.calculate().regular.eitherSurvivor75.toFixed(2)).to.equal(expectedSurvivor25Red, `survivor 25% Reduced test`);

            expect(calc.calculate().acceleratedUntil62.annuitantsLife.toFixed(2)).to.equal(expectedAcceleratedUntil62, `Accelerated until age 62 regular`);
            /*
            expect(calc.calculate().acceleratedUntil62.guaranteed60.toFixed(2)).to.equal(expectedAcceleratedUntil62, `Accelerated until age 62 regular`);
            expect(calc.calculate().acceleratedUntil62.guaranteed180.toFixed(2)).to.equal(expectedAcceleratedUntil62, `Accelerated until age 62 regular`);
            expect(calc.calculate().acceleratedUntil62.survivor75.toFixed(2)).to.equal(expectedAcceleratedUntil62, `Accelerated until age 62 regular`);
            expect(calc.calculate().acceleratedUntil62.survivor100.toFixed(2)).to.equal(expectedAcceleratedUntil62, `Accelerated until age 62 regular`);
            expect(calc.calculate().acceleratedUntil62.survivor100with180.toFixed(2)).to.equal(expectedAcceleratedUntil62, `Accelerated until age 62 regular`);
            expect(calc.calculate().acceleratedUntil62.eitherSurvivor75.toFixed(2)).to.equal(expectedAcceleratedUntil62, `Accelerated until age 62 regular`);
            */

            expect(calc.calculate().acceleratedAfter62.annuitantsLife.toFixed(2)).to.equal(expectedAcceleratedAfter62, `Accelerated after age 62 regular`);
            /*
            expect(calc.calculate().acceleratedAfter62.guaranteed60.toFixed(2)).to.equal(expectedAcceleratedAfter62, `Accelerated after age 62 regular`);
            expect(calc.calculate().acceleratedAfter62.guaranteed180.toFixed(2)).to.equal(expectedAcceleratedAfter62, `Accelerated after age 62 regular`);
            expect(calc.calculate().acceleratedAfter62.survivor75.toFixed(2)).to.equal(expectedAcceleratedAfter62, `Accelerated after age 62 regular`);
            expect(calc.calculate().acceleratedAfter62.survivor100.toFixed(2)).to.equal(expectedAcceleratedAfter62, `Accelerated after age 62 regular`);
            expect(calc.calculate().acceleratedAfter62.survivor100with180.toFixed(2)).to.equal(expectedAcceleratedAfter62, `Accelerated after age 62 regular`);
            expect(calc.calculate().acceleratedAfter62.eitherSurvivor75.toFixed(2)).to.equal(expectedAcceleratedAfter62, `Accelerated after age 62 regular`);
            */

            expect(calc.calculate().optionalPension).to.equal(expectedOptional, `voluntary contrib`);
        });
    }
}

function transformTest(test) {
    const age = getAgeOnDate(test.birthDate, test.retireDate)
    const avgSalary = getAverageSalary(test);
    const bd = new Date(test.birthDate).toISOString().substr(0,10)

    const example1 = {
        name: test.name,
        birthday: bd,
        withdrawalAge: age,
        terminationAge: age,
        averageHighestAnnualSalary: avgSalary,
        age62ProjectedMonthlySSI: roundNum(test.socialSecurityAt62,2),
    };

    if( test.survivorBirthDate !== "") {
        const survivorBd = new Date(test.survivorBirthDate).toISOString().substr(0,10);
        example1.survivorBirthday = survivorBd;
    }

    finalData = {
        ...example1,
        salary: [{
            workingYears: roundNum(test.generalBefore2000,2),
            serviceCategory: "general",
            eraCategory: "pre2000"
        }, {
            workingYears: roundNum(test.generalAfter1999,2),
            serviceCategory: "general",
            eraCategory: "post1999"
        },
        {
            workingYears: roundNum(test.protectiveWithSocBefore2000,2),
            serviceCategory: "protective_with_ss",
            eraCategory: "pre2000"
        },
        {
            workingYears: roundNum(test.protectiveWithSocAfter1999,2),
            serviceCategory: "protective_with_ss",
            eraCategory: "post1999"
        },
        {
            workingYears: roundNum(test.protectiveNoSocBefore2000,2),
            serviceCategory: "protective_wo_ss",
            eraCategory: "pre2000"
        },
        {
            workingYears: roundNum(test.protectivNoSocAfter1999,2),
            serviceCategory: "protective_wo_ss",
            eraCategory: "post1999"
        },
        {
            workingYears: roundNum(test.electedBefore2000,2),
            serviceCategory: "elected",
            eraCategory: "pre2000"
        },
        {
            workingYears: roundNum(test.electedAfter1999,2),
            serviceCategory: "elected",
            eraCategory: "post1999"
        },
        {
            workingYears: roundNum(test.electedAfterAct10,2),
            serviceCategory: "elected",
            eraCategory: "postAct10"
        }],
        contribution: {
            currentBalance: Number(test.employeeAdditionalContribution) + Number(test.employerAdditionalContribution),
            assumedRate: 0.00,
            startingContribution: 0,
            contributionIncreaseRate: 0
        }
    };

    return finalData;
}

function getAgeOnDate(birthDate, futureDate){
    let bd = new Date(birthDate);
    let fd = new Date(futureDate);
    let futureBd = new Date(bd);
    futureBd.setYear(fd.getFullYear());
    let x = (futureBd>fd)?(fd.getFullYear() - bd.getFullYear()-1):fd.getFullYear() - bd.getFullYear();
    return x;
}

function getAverageSalary(test){
    const avgSalary = (
        (test.yearOneHighestEarnings * test.yearOneService) +
        (test.yearTwoHighestEarnings * test.yearTwoService) +
        (test.yearThreeHighestEarnings * test.yearThreeService)
    ) / 3;
    return avgSalary;
}

function roundNum(num, length) {
    var number = Math.round(num * Math.pow(10, length)) / Math.pow(10, length);
    return number;
}