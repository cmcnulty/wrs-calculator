var calc = require ('./index');
var expect = require('chai').expect;
var tests = require('./seleniumTestResults.json');


describe ('#calculate()', function() {

    // https://etf.wi.gov/retirement/saving-retirement/wrs-retirement-benefit-calculations
    /* 
        The sample worksheet on the next page shows a formula calculation. It includes columns for 
        post-Act 10 service. Only members in the Elected/Executive category have post-Act 10 service.
        The sample is for a general category employee who is age 59, who has a spouse or domestic 
        partner who is age 53.The employee has a final average monthly earnings of $2,500, 25 years of 
        creditable service (5 years pre-2000 and 20 years post-1999), and a projectedage 62 Social 
        Security benefit of 840.The employee participates in the Variable Fund and his total Variable 
        Excess balance is $10,000. The employee selects a Joint Survivor 100% continued option. The 
        estimated $840 is from the 2020 tables. The money purchase and option conversion factors are 
        effective January 1, 2020.
        
    */
    var example1 = {
        birthday: "1977-03-31",
        withdrawalAge: 59,
        terminationAge: 59,
        salary: [{
            averageHighestAnnualSalary: 30000,
            workingYears: 5,
            serviceCategory: "general",
            eraCategory: "pre2000"
        }, {
            averageHighestAnnualSalary: 30000,
            workingYears: 20,
            serviceCategory: "general",
            eraCategory: "post1999"
        }],
        contribution: {
            currentBalance: 0,
            assumedRate: 0.04,
            startingContribution: 0,
            contributionIncreaseRate: 0
        } 
    };



    for(const i in tests) {
        let ex = transformTest(tests[i].data);
        let expectedMonthly = Number(tests[i].results.AnnuitantsLifeOnlyReg.replace(/[^0-9.-]+/g,"")).toFixed(2);
        let expectedOptional = Number(tests[i].results.AnnuitantsLifeOnlyAddCont.replace(/[^0-9.-]+/g,"")).toFixed(2);

        it(`should pass generated test: ${i}, ${expectedMonthly}, ${expectedOptional}`, function(){
            // console.log(i);
            expect(calc(ex).monthlyPension).to.equal(expectedMonthly, `pension test: ${i}`);
            expect(calc(ex).optionalPension).to.equal(expectedOptional, `voluntary contrib: ${i}`);
           // console.log(expectedMonthly);
        });
    }


    
    // PASSES
    /*
    it('should calculate pension correctly', function(){
        expect(calc(example1).monthlyPension).to.equal('971.64');
    });
    */

    /*
    https://etf.wi.gov/retirement/saving-retirement/wrs-retirement-benefit-calculations
    */
    var example2 = {
    birthday: "1977-03-31",
    withdrawalAge: 61,
    terminationAge: 61,
    salary: [{
        averageHighestAnnualSalary: 41028,
        workingYears: 2.55,
        serviceCategory: "general",
        eraCategory: "pre2000"
    }, {
        averageHighestAnnualSalary: 41028,
        workingYears: 20.01,
        serviceCategory: "general",
        eraCategory: "post1999"
    }],
    contribution: {
        currentBalance: 0,
        assumedRate: 0.04,
        startingContribution: 0,
        contributionIncreaseRate: 0
    }    
    };
/*
    it('should calculate pension correctly with partial years', function(){
        expect(calc(example2).monthlyPension).to.equal('1189.83');
    });


    var pensionOpts = {
        birthday: '1977-03-31',
        terminationAge: 65,
        withdrawalAge: 65,
        salary: [{
            averageHighestAnnualSalary: 54000,
            workingYears: 5,
            serviceCategory: "general",
            eraCategory: "post1999"
        }],
        contribution: {
            currentBalance: 0,
            assumedRate: 0.04,
            startingContribution: 0,
            contributionIncreaseRate: 0
        }
    };

    // contributing years should be no more than combined workingYears, because you can only contribute
    // during years you are active. However, you may have contributed only the first few years of your active
    // period, or the last few years, which would make a big difference, except that any past performance 
    // should be captured in the balance, in which case we always just track from current age to termination age
    var moneyOpts = {
        birthday: '1978-07-27',
        terminationAge: 65,
        withdrawalAge: 65,
        salary: [{
            averageHighestAnnualSalary: 54000,
            workingYears: 23,
            serviceCategory: "general",
            eraCategory: "post1999"
        }],
        contribution: {
            currentBalance: 0,
            assumedRate: 0.04,
            startingContribution: 2400,
            contributionIncreaseRate: 0
        }
    };

    it('should calculate pension correctly', function(){
        expect(calc(pensionOpts).monthlyPension).to.equal('360.00');

        const earlyRetirement = {...pensionOpts}
        earlyRetirement.withdrawalAge = 64;
        expect(calc(earlyRetirement).monthlyPension).to.equal('345.60');

        const maxBenefitAmount = {...pensionOpts}
        maxBenefitAmount.salary[0].workingYears = 44;
        expect(calc(maxBenefitAmount).monthlyPension).to.equal('3150.00');

        const invalidOpts = {...pensionOpts}
        invalidOpts.contribution.currentBalance = -1;
        expect(() => {
            calc(invalidOpts)
        }).to.throw();
    });

    it('should calculate money purchase correctly', function(){
        var moneyPurchase = calc(moneyOpts);
        expect(moneyPurchase.optionalPension).to.equal('574.75');
    });
*/
});

function transformTest(test) {
    const age = getAgeOnDate(test.birthDate, test.retireDate)
    const avgSalary = getAverageSalary(test);
    const bd = new Date(test.birthDate).toISOString().substr(0,10)
    var example1 = {
        birthday: bd,
        withdrawalAge: age,
        terminationAge: age,
        salary: [{
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.generalBefore2000,2),
            serviceCategory: "general",
            eraCategory: "pre2000"
        }, {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.generalAfter1999,2),
            serviceCategory: "general",
            eraCategory: "post1999"
        },
        {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.protectiveWithSocBefore2000,2),
            serviceCategory: "protective_with_ss",
            eraCategory: "pre2000"
        },
        {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.protectiveWithSocAfter1999,2),
            serviceCategory: "protective_with_ss",
            eraCategory: "post1999"
        },
        {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.protectiveNoSocBefore2000,2),
            serviceCategory: "protective_wo_ss",
            eraCategory: "pre2000"
        },
        {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.protectivNoSocAfter1999,2),
            serviceCategory: "protective_wo_ss",
            eraCategory: "post1999"
        },
        {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.electedBefore2000,2),
            serviceCategory: "elected",
            eraCategory: "pre2000"
        },
        {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.electedAfter1999,2),
            serviceCategory: "elected",
            eraCategory: "post1999"
        },
        {
            averageHighestAnnualSalary: avgSalary,
            workingYears: roundNum(test.electedAfterAct10,2),
            serviceCategory: "elected",
            eraCategory: "postAct10"
        }],
        contribution: {
            currentBalance: Number(test.employeeAdditionalContribution) + Number(test.employerAdditionalContribution),
            assumedRate: 0.00,
            startingContribution: 0, // (roundNum(test.employeeAdditionalContribution,2)/roundNum(test.generalAfter1999,2)),
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