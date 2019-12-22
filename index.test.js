var calc = require ('./index');
var expect = require('chai').expect;


describe ('#calculate()', function() {
    var pensionOpts = {
        birthday: '1977-03-31',
        workingYears: 5,
        retirementAge: 65,
        currentBalance: 0,
        assumedRate: 0.05,
        annualContribution: 0,
        averageHighestAnnualSalary: 54000
    };

    var moneyOpts = {
        birthday: '1978-07-27',
        workingYears: 23,
        retirementAge: 65,
        currentBalance: 0,
        assumedRate: 0.04,
        annualContribution: 2400,
        averageHighestAnnualSalary: 54000
    };

    it('should calculate pension correctly', function(){
        expect(calc(pensionOpts).monthlyPension).to.equal('360.00');

        const earlyRetirement = {...pensionOpts}
        earlyRetirement.retirementAge = 64;
        expect(calc(earlyRetirement).monthlyPension).to.equal('345.60');

        const maxBenefitAmount = {...pensionOpts}
        maxBenefitAmount.workingYears = 44;
        expect(calc(maxBenefitAmount).monthlyPension).to.equal('3150.00');

        const invalidOpts = {...pensionOpts}
        invalidOpts.currentBalance = -1;
        expect(() => {
            calc(invalidOpts)
        }).to.throw();
    });

    it('should calculate money purchase correctly', function(){
        var moneyPurchase = calc(moneyOpts);
        expect(moneyPurchase.optionalPension).to.equal('242.24');
    });

});
