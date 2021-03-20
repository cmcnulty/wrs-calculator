var Calculator = require ('./index');
var expect = require('chai').expect;
var glob = require( 'glob' );

describe ('#calculate()', function() {
    glob.sync( './test-data/**/*.json' ).forEach( function( file ) {
        var tests = require(file);
        for(const i in tests) {
            describe('#dunno()', testRow.bind(null,tests[i]));
        }
    });
});

function testRow (testData) {
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
        let expectedOptional = Number(testData.results.AnnuitantsLifeOnlyAddCont.replace(/[^0-9.-]+/g,"")).toFixed(2);

        it(`should pass generated test: ${ex.name}`, function(){
            expect(calc.calculate().regular.annuitantsLife.toFixed(2)).to.equal(expectedMonthly, `pension test`);
            expect(calc.calculate().regular.guaranteed60.toFixed(2)).to.equal(expectedGuaranteed60, `guaranteed 60 test`);
            expect(calc.calculate().regular.guaranteed180.toFixed(2)).to.equal(expectedGuaranteed180, `guaranteed 180 test`);
            expect(calc.calculate().regular.survivor75.toFixed(2)).to.equal(expectedSurvivor75, `guaranteed 180 test`);
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