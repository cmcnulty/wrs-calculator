const compound = require('compound-interest-calc')
const ageReductionFactors = require( './age-reduction-factors.json');
const moneyPurchaseCalculationFactors = require( './money-purchase-calculation-factors.json');
const optionsSchema = require( './options-schema.json');
const Ajv = require('ajv');

function RetirementBalance( options ) {
    const POST_1999_TEACHERS = .016;
    const NO_REDUCTION_AGE = 65;
    const NO_REDUCTION_YEARS_OF_SERVICE = 30;
    const MAX_GENERAL_BENEFIT_AMOUNT = 0.7;
    const YEARS_TO_VEST = 5;


    var ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
    var validate = ajv.compile(optionsSchema);
    var valid = validate(options);
    if (!valid) {
        throw new Error(`${validate.errors[0].dataPath} - ${validate.errors[0].message}`);
    }

    this.birthday = new Date(options.birthday);
    this.age = calculateAge(this.birthday);
    this.workingYears = options.workingYears;
    this.retirementAge = options.retirementAge;
    this.currentBalance = options.currentBalance;
    this.assumedRate = options.assumedRate;
    this.annualContribution = options.annualContribution;
    this.averageHighestAnnualSalary = options.averageHighestAnnualSalary;

    RetirementBalance.prototype.calculate = function() {
        const monthlyPension = this.calculatePension();
        const monthlyResult = this.calculateMoneyPurchase();

        return{
            monthlyPension: monthlyPension.toFixed(2),
            optionalPension: monthlyResult.toFixed(2),
        };
    }

    RetirementBalance.prototype.calculateMoneyPurchase = function (){
        const rate = moneyPurchaseCalculationFactors[this.retirementAge];
        const remainingYears = this.retirementAge - (this.age + this.workingYears);
        const compoundedAmountWhileWorking = calculateCompoundGrowth(this.currentBalance, this.annualContribution, this.workingYears, this.assumedRate);
        const workingPhase = this.workingYears === 0 ? this.currentBalance : compoundedAmountWhileWorking.result;
        const amountContribuedWhileInactive = 0
        const compoundedAmountAfterLeaving = calculateCompoundGrowth(workingPhase, amountContribuedWhileInactive, remainingYears, this.assumedRate);
        const waitingPhase = compoundedAmountAfterLeaving.result;
        const monthlyResult = waitingPhase * rate;
        return monthlyResult;
    }

    RetirementBalance.prototype.calculatePension = function (){
        const ageReductionFactor = this.workingYears >= YEARS_TO_VEST ? (ageReductionFactors[Math.min(this.workingYears, NO_REDUCTION_YEARS_OF_SERVICE)][Math.min(this.retirementAge, NO_REDUCTION_AGE)]) : 0;
        const monthlyHighestSalary = this.averageHighestAnnualSalary / 12;
        const maxBenefit = (monthlyHighestSalary * MAX_GENERAL_BENEFIT_AMOUNT);
        const monthlyPension = Math.min(monthlyHighestSalary * POST_1999_TEACHERS * this.workingYears * ageReductionFactor, maxBenefit);
        return monthlyPension

    }

    function calculateAge(birthday) { // birthday is a date
        var ageDifMs = Date.now() - birthday.getTime();
        var ageDate = new Date(ageDifMs); // miliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    // wrapper so that it was easier to test altnertive modules
    function calculateCompoundGrowth( currentBalance, annualContribution, compoundedYears, interestRate){
        return compound(currentBalance, annualContribution, compoundedYears, interestRate);
    }

}




module.exports = function createRetirementBalance(opt) {
    return new RetirementBalance(opt).calculate();
}
