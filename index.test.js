var Calculator = require ('./index');
var expect = require('chai').expect;
var tests = require('./seleniumTestResults.json');


describe ('#calculate()', function() {

    for(const i in tests) {
        let ex = transformTest(tests[i].data);
        let calc = Calculator(ex);
        if( calc.getMinimumRetirementAge(ex.salary) > ex.withdrawalAge ) {
            // We have to do this test first because SeIDE returns values for 
            // ages less than min retirement age for some reason
            expect(() => calc.calculate()).to.throw('Minimum retirement age not reached');

        } else if( tests[i].results.AnnuitantsLifeOnlyReg === 'ERROR' ) {

            // If SeIDE throws an exception that's not about age, we're currently not trapping it.
            it(`should pass generated test: ${i}, ERROR`, function() {
                expect(() => calc.calculate()).to.throw('asdf');
            });

        } else {

            // Otherwise use the results of the SeIDE test run
            let expectedMonthly = Number(tests[i].results.AnnuitantsLifeOnlyReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
            let expectedGuaranteed60 = Number(tests[i].results.SixtyPaymentsReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
            let expectedGuaranteed180 = Number(tests[i].results.OneEightyPaymentsGuaranteedReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
            let expectedSurvivor75 = Number(tests[i].results.Survivor75Reg.replace(/[^0-9.-]+/g,"")).toFixed(2);
            let expectedOptional = Number(tests[i].results.AnnuitantsLifeOnlyAddCont.replace(/[^0-9.-]+/g,"")).toFixed(2);
    
            it(`should pass generated test: ${i}, ${expectedMonthly}, ${expectedOptional}`, function(){
                expect(calc.calculate().regular.annuitantsLife.toFixed(2)).to.equal(expectedMonthly, `pension test: ${i}`);
                expect(calc.calculate().regular.guaranteed60.toFixed(2)).to.equal(expectedGuaranteed60, `guaranteed 60 test: ${i}`);
                expect(calc.calculate().regular.guaranteed180.toFixed(2)).to.equal(expectedGuaranteed180, `guaranteed 180 test: ${i}`);
                expect(calc.calculate().regular.survivor75.toFixed(2)).to.equal(expectedSurvivor75, `guaranteed 180 test: ${i}`);
                expect(calc.calculate().optionalPension).to.equal(expectedOptional, `voluntary contrib: ${i}`);
            });
        }
    }


});

function transformTest(test) {
    const age = getAgeOnDate(test.birthDate, test.retireDate)
    const avgSalary = getAverageSalary(test);
    const bd = new Date(test.birthDate).toISOString().substr(0,10)
    var example1 = {
        birthday: bd,
        withdrawalAge: age,
        terminationAge: age,
        averageHighestAnnualSalary: avgSalary,
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

    return example1;
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