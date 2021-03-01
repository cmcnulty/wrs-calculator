const compound = require('compound-interest-calc')
const moneyPurchaseCalculationFactors = require('./money-purchase-calculation-factors.json');
const optionsSchema = require('./options-schema.json');
const formulaMultipler = require('./formula-multiplier.json' );
const Ajv = require('ajv');

function RetirementBalance( options ) {
    const MAX_GENERAL_BENEFIT_AMOUNT = 0.7;
    const PROTECTIVE_CATEGORIES = ['protective_with_ss', 'protective_wo_ss'];

    var ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
    var validate = ajv.compile(optionsSchema);
    var valid = validate(options);
    if (!valid) {
        throw new Error(`${validate.errors[0].dataPath} - ${validate.errors[0].message}`);
    }

    const minRetirementAge = getMinimumRetirementAge( options.salary);
    if (options.withdrawalAge < minRetirementAge) {
        throw new Error(`Minimum retirement age not reached: ${options.withdrawalAge} < ${minRetirementAge}`);
    }

    this.birthday = new Date(options.birthday);
    this.age = calculateAge(this.birthday);
    this.withdrawalAge = options.withdrawalAge;
    this.terminationAge = options.terminationAge;

    this.currentBalance = options.currentBalance;
    this.annualContribution = options.annualContribution;
    this.contribution = options.contribution;


    RetirementBalance.prototype.calculate = function() {
        let monthlyPension = 0;
        const totalYears = parseFloat(roundNum(options.salary.map(item => item.workingYears).reduce((prev, next) => prev + next),2));
        for(const salary of options.salary) {
            monthlyPension += this.calculatePension(salary, totalYears);
        }

        const monthlyResult = this.calculateMoneyPurchase();

        return{
            monthlyPension: monthlyPension.toFixed(2),
            optionalPension: monthlyResult.toFixed(2),
        };
    }

    RetirementBalance.prototype.calculateMoneyPurchase = function (){
        const rate = moneyPurchaseCalculationFactors[this.withdrawalAge];
        const inactiveYears = this.withdrawalAge - this.terminationAge;
        const remainingActiveYears = Math.max(this.terminationAge - this.age, 0);
        const compoundedAmountWhileWorking = calculateCompoundGrowth(this.contribution.currentBalance, this.contribution.startingContribution, remainingActiveYears, this.contribution.assumedRate);
        const workingPhase = remainingActiveYears === 0 ? this.contribution.currentBalance : compoundedAmountWhileWorking.result;
        const amountContribuedWhileInactive = 0
        const compoundedAmountAfterLeaving = calculateCompoundGrowth(workingPhase, amountContribuedWhileInactive, inactiveYears, this.contribution.assumedRate);
        const waitingPhase = compoundedAmountAfterLeaving.result;
        const monthlyResult = waitingPhase * rate;
        // console.log(rate,inactiveYears,remainingActiveYears,compoundedAmountWhileWorking,workingPhase);
        // console.log(compoundedAmountAfterLeaving, waitingPhase, monthlyResult);
        return monthlyResult;
    }

    RetirementBalance.prototype.calculatePension = function (salary, totalYears) {
        
        const normalRetirementAge = getNormalRetirementAge(salary.serviceCategory, '2020-01-01',totalYears);
        const ageReductionFactor = calculateAgeReductionFactor(salary.serviceCategory, this.withdrawalAge, normalRetirementAge, totalYears);
        const multipler = formulaMultipler[salary.serviceCategory][salary.eraCategory];
        // console.log(`age reduction factor: ${ageReductionFactor}, from Table: ${ageReductionFactorFromTable} formula multiplier: ${multipler}`);
        const monthlyHighestSalary = salary.averageHighestAnnualSalary / 12;
        const maxBenefit = (monthlyHighestSalary * MAX_GENERAL_BENEFIT_AMOUNT);
        const monthlyPension = Math.min(monthlyHighestSalary * multipler * salary.workingYears * ageReductionFactor, maxBenefit);
        // console.log(monthlyPension);
        return parseFloat(roundNum(monthlyPension,2));

    }

    function calculateAge(birthday) { // birthday is a date
        var ageDifMs = Date.now() - birthday.getTime();
        var ageDate = new Date(ageDifMs); // miliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    
    function getNormalRetirementAge(serviceCategory, startDate, combinedServiceYears) {
            /*
        Age 53:  Protective occupation employees with at least 25
        years of creditable service, including creditable military
        service.
        Age 54:  Protective occupation employees with less
        than 25 years of creditable service, including creditable
        military service.
        Age 62:  Elected officials, state executive retirement plan 
        employees, and judges who first began in one of these 
        categories before January 1, 2017.
        Age 65:  General employees, teachers and educational support
        staff. Additionally, elected officials, state executive
        retirement plan employees, and judges who first began in
        one of these categories after December 31, 2016.
        ---
        • General—65 (57 with 30 years of service)
        • Protective—54 (53 with 25 years of service)
        • Executive and Elected—62 (57 with 30 years of service); for those who become Executive
        or Elected on or after 1/1/2017—65 (57 with 30 years of service)
        */
        let normalRetirementAge = 0;
        switch (serviceCategory) {
            case 'general':
                normalRetirementAge = (combinedServiceYears >= 30) ? 57 : 65;
                break;
            case 'protective_with_ss':
            case 'protective_wo_ss':
                normalRetirementAge = (combinedServiceYears >= 25) ? 53 : 54;
                break;
            case 'elected':
                if(combinedServiceYears >= 30) {
                    normalRetirementAge = 57;
                } else if(startDate >= '2017-01-01') {
                    normalRetirementAge = 65;
                } else {
                    normalRetirementAge = 62;
                }
                break;
            default: 
                throw `invalid service category: ${serviceCategory}`;
        } 
        return normalRetirementAge;
    }

    function getMinimumRetirementAge( salary ){
        const protective = salary.find( el => PROTECTIVE_CATEGORIES.includes(el.serviceCategory));
        if(protective) {
            return 50;
        } else {
            return 55;
        }
    }

    function calculateAgeReductionFactor(serviceCategory, retirementAge, normalRetirementAge, totalYears) {
        // console.log(arguments);
        /*
        The annuities of protective category
        employees are reduced .4% per month for
        each month of age below normal
        retirement age. 
        
        The annuities of
        non-protective employees are reduced
        .4% per month between ages 55 and 57.
        Between age 57 and normal retirement
        age, the .4% is reduced by .001111% for
        each month of creditable service
        including creditable active military
        service. These are permanent reductions
        to annuities and continue to apply
        after your normal retirement age.
        
        Actual reduction per year for 25 years of service above age 57 = .008
        Actual reduction per year for 22 years = .01275 = .0010625/month

        */
        const baseReduction = 0.004;
        const reductionBelow57 = baseReduction * 12
        let annualReductionAt57 = reductionBelow57;

        // if it's general or elected, age reduction slows down nearer retirement
        if(['general','elected'].includes(serviceCategory)) {
            const reductionModifier = 0.00001111; //.001111% = .00001111
            // online calculator seems to round months to whole number
            const totalMonths = parseFloat(roundNum(totalYears * 12,0));
            monthlyReduction = (baseReduction - (reductionModifier * totalMonths));
            annualReductionAt57 = monthlyReduction*12;

        }
        
        let totalReduction = 0;
        // todo - this could be ninja-fied with an array fill
        while (normalRetirementAge > retirementAge){
            if (retirementAge < 57) {
                totalReduction += reductionBelow57;
            } else {
                totalReduction += annualReductionAt57;
            }
            retirementAge++;
        }

        return parseFloat(roundNum((1 - totalReduction),3));

    }

    function roundNum(num, length) { 
        var number = Math.round(num * Math.pow(10, length)) / Math.pow(10, length);
        return number;
    }

    // wrapper so that it was easier to test altnertive modules
    function calculateCompoundGrowth( currentBalance, annualContribution, compoundedYears, interestRate){
        // console.log(arguments);
        const result = compound(currentBalance, annualContribution, compoundedYears, interestRate);

        // fix bug with compound-interest-calc - doesn't handle zero years too well :(
        if(!(compoundedYears > 0)){
            result.result = currentBalance;
        }

        // doesn't handle zero percent interest rate - in that case, just multiply
        if ( interestRate === 0) {
            result.result = currentBalance + (annualContribution * compoundedYears);
        }

        return result;
    }

}

module.exports = function createRetirementBalance(opt) {
    return new RetirementBalance(opt).calculate();
}
