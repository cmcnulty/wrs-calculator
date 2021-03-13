
const Ajv = require('ajv');
const compound = require('compound-interest-calc')

const moneyPurchaseCalculationFactors = require('./tables/money-purchase-calculation-factors.json');
const formulaMultipler = require('./tables/formula-multiplier.json' );
const nonProtectiveGuaranteedFactors = require('./tables/non-protective-guaranteed-factors.json');
const protectiveGuaranteedFactors = require('./tables/protective-guaranteed-factors.json');
const survivor75 = require('./tables/75-percent-survivor.json');

const optionsSchema = require('./options-schema.json');

const PROTECTIVE_CATEGORIES = ['protective_with_ss', 'protective_wo_ss'];
const MAX_GENERAL_BENEFIT_AMOUNT = 0.7;

class RetirementBalance {
    constructor( options ) {
        var ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
        var validate = ajv.compile(optionsSchema);
        var valid = validate(options);
        if (!valid) {
            throw new Error(`${validate.errors[0].dataPath} - ${validate.errors[0].message}`);
        }

        this.salary = options.salary;
        this.birthday = new Date(options.birthday);

        this.age = this.calculateAge(this.birthday);
        if(options.survivorBirthday) {
            this.survivorBirthday = new Date(options.survivorBirthday);
            this.survivorAge = this.calculateAge(this.survivorBirthday);
        }

        this.withdrawalAge = options.withdrawalAge;
        this.terminationAge = options.terminationAge;

        this.currentBalance = options.currentBalance;
        this.annualContribution = options.annualContribution;
        this.contribution = options.contribution;
        this.averageHighestAnnualSalary = options.averageHighestAnnualSalary;
    }

    calculate = function() {
        const minRetirementAge = this.getMinimumRetirementAge(this.salary);
        if (this.withdrawalAge < minRetirementAge) {
            throw new Error(`Minimum retirement age not reached: ${this.withdrawalAge} < ${minRetirementAge}`);
        }

        let monthlyPension = {
            annuitantsLife: 0,
            guaranteed60: 0,
            guaranteed180: 0,
            survivor75:0,
            survivor100: 0,
            eitherSurvivor75: 0,
            survivor100with180: 0
        };
        const allResults = {
            regular: {...monthlyPension},
            acceleratedUntil62: {...monthlyPension},
            acceleratedAfter62: {...monthlyPension},
        };

        const totalYears = parseFloat(RetirementBalance.roundNum(this.salary.map(item => item.workingYears).reduce((prev, next) => prev + next),2));
        for(const salary of this.salary) {
            const aPension = this.calculatePension(salary, totalYears);
            allResults.regular = this.mergeResults([aPension.regular, allResults.regular]);
            allResults.acceleratedUntil62 = this.mergeResults([aPension.acceleratedUntil62, allResults.acceleratedUntil62]);
            allResults.acceleratedAfter62 = this.mergeResults([aPension.acceleratedAfter62, allResults.acceleratedAfter62]);
        }

        const monthlyResult = this.calculateMoneyPurchase();

        return{
            ...allResults, // allResults.regular.annuitantsLife.toFixed(2),
            optionalPension: monthlyResult.toFixed(2),
        };
    }

    calculateMoneyPurchase = function (){
        const rate = moneyPurchaseCalculationFactors[this.withdrawalAge];
        const inactiveYears = this.withdrawalAge - this.terminationAge;
        const remainingActiveYears = Math.max(this.terminationAge - this.age, 0);
        const compoundedAmountWhileWorking = RetirementBalance.calculateCompoundGrowth(this.contribution.currentBalance, this.contribution.startingContribution, remainingActiveYears, this.contribution.assumedRate);
        const workingPhase = remainingActiveYears === 0 ? this.contribution.currentBalance : compoundedAmountWhileWorking.result;
        const amountContribuedWhileInactive = 0
        const compoundedAmountAfterLeaving = RetirementBalance.calculateCompoundGrowth(workingPhase, amountContribuedWhileInactive, inactiveYears, this.contribution.assumedRate);
        const waitingPhase = compoundedAmountAfterLeaving.result;
        this.currentBalance = waitingPhase;
        const monthlyResult = waitingPhase * rate;
        /*
            additionalContributions: {...resultSet},
            additionalCertain24: 0,
            additionalCertain60: 0,
            additionalCertain120: 0,
            lumpSum: 0,
*/
        return monthlyResult;
    }

    calculatePension = function (salary, totalYears) {
        const isProtective = PROTECTIVE_CATEGORIES.includes(salary.serviceCategory);
        const normalRetirementAge = this.getNormalRetirementAge(salary.serviceCategory, '2020-01-01',totalYears);

        const guaranteedFactor60 = this.getGuaranteedFactor(isProtective, this.withdrawalAge, normalRetirementAge, 60);
        const guaranteedFactor180 = this.getGuaranteedFactor(isProtective,this.withdrawalAge, normalRetirementAge, 180);

        const survivor75Factor = this.getSurvivor75Factor(this.age, this.survivorAge);

        const ageReductionFactor = RetirementBalance.calculateAgeReductionFactor(salary.serviceCategory, this.withdrawalAge, normalRetirementAge, totalYears);
        const multipler = formulaMultipler[salary.serviceCategory][salary.eraCategory];
        const monthlyHighestSalary = this.averageHighestAnnualSalary / 12;
        const maxBenefit = (monthlyHighestSalary * MAX_GENERAL_BENEFIT_AMOUNT);
        const monthlyPension = Math.min(monthlyHighestSalary * multipler * salary.workingYears * ageReductionFactor, maxBenefit);

        const resultSet = {
            annuitantsLife: 0,
            guaranteed60: 0,
            guaranteed180: 0,
            survivor75:0,
            survivor100: 0,
            eitherSurvivor75: 0,
            survivor100with180: 0
        };
        const allResults = {
            regular: {...resultSet},
            acceleratedUntil62: {...resultSet},
            acceleratedAfter62: {...resultSet},
        };
        allResults.regular.annuitantsLife = parseFloat(RetirementBalance.roundNum(monthlyPension,2));
        allResults.regular.guaranteed60 = guaranteedFactor60 * monthlyPension;
        allResults.regular.guaranteed180 = guaranteedFactor180 * monthlyPension;
        allResults.regular.survivor75 = survivor75Factor * monthlyPension;
        return allResults
    }
    
    mergeResults = function ( data ) {
        const result = {};       
        data.forEach(resultSet => {
          for (let [key, value] of Object.entries(resultSet)) {
            if (result[key]) {
              result[key] += value;
            } else {
              result[key] = value;
            }
          }
        });
        return result;
      };
      

    calculateAge(birthday) { // birthday is a date
        var ageDifMs = Date.now() - birthday.getTime();
        var ageDate = new Date(ageDifMs); // miliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    
    getNormalRetirementAge(serviceCategory, startDate, combinedServiceYears) {
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

    /* The SECURE Act of 2019 changed the age at which RMDs must begin. 
    *  If you were born July 1, 1949 or later your first RMD will be in the year you turn age 72. 
    *  If you were born before July 1, 1949 the age remains 70 1/2. 
    * */
    getRequiredDistributionAge = () => {
        let inactiveRetirementAge = 70.5
        if (this.birthday >= new Date('1949-07-01')) {
            inactiveRetirementAge = 72
        } 
        return Math.max(inactiveRetirementAge, this.terminationAge);
    }

    getMinimumRetirementAge( salary ) {
        const protective = salary.find( el => PROTECTIVE_CATEGORIES.includes(el.serviceCategory) && el.workingYears > 0);
        if(protective) {
            return 50;
        } else {
            return 55;
        }
    }

    static calculateAgeReductionFactor(serviceCategory, retirementAge, normalRetirementAge, totalYears) {
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
            const totalMonths = parseFloat(RetirementBalance.roundNum(totalYears * 12,0));
            const monthlyReduction = (baseReduction - (reductionModifier * totalMonths));
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

        return parseFloat(RetirementBalance.roundNum((1 - totalReduction),3));

    }

    getGuaranteedFactor(isProtective, age, normalRetirementAge, months) {
        let factorTable;
        let effAge;
        if(isProtective){
            factorTable = protectiveGuaranteedFactors;
            effAge = Math.min(age, normalRetirementAge);         
        } else {
            factorTable = nonProtectiveGuaranteedFactors;
            effAge = Math.min(age, 62);               
        }

        return (factorTable[effAge] && factorTable[effAge][months]) || 0;
    }

    getSurvivor75Factor(age, survivorAge) {
        return (survivor75[survivorAge] && survivor75[survivorAge][age]) || 0;
    }

    static roundNum(num, length) { 
        var number = Math.round(num * Math.pow(10, length)) / Math.pow(10, length);
        return number;
    }

    // wrapper so that it was easier to test altnertive modules
    static calculateCompoundGrowth( currentBalance, annualContribution, compoundedYears, interestRate){
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

module.exports = (opt) => new RetirementBalance(opt);
