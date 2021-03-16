# Development notes

## Selenium notes
Attempting to put the selenium tests into a suite to run them in parallel fails because
 there is no way to allow them to keep running on failure (including using verify instead of assert)
 we could capture the std out instead of going through the work of writing out a file, picking it up and deleting it...
 however, the file output is much cleaner than the std out, so it's nicer to work with.

## Survivor file gaps notes:
 It appears that the gap years in the survivor files are intended to just split the difference,
 however it looks like it's not consistent between rounding and flooring, e.g.:

ages 62/58 = .890 (via their calculator)
.885/.896 = 890.5 (via table), which rounds to .891 - so FLOOR is "correct" in this case
vs.
ages 62/64 = .923 (via their calculator)
.917, .928 = 922.5 (via table) which rounds to 923, so ROUND is "correct" in this case. :-(
 
and therefore we'll have to
 fill in the gaps by actually running hundreds of selenium tests to actually observe the factors...
 but that will be tricky because generally it won't use age above retirement age, it'll use normal retirement age. 
 Alternatively, we can just unit test the ones that work, and not sweat the other ones. We could also try to request the full 
 table from WRS.

## Visualization:
what to graph:
    income at various retirement ages (years of service)
    income at various contribution levels (and increase factors/rates of growth)

## Todo:
additional options to implement:
accelerated payments
joint/survivor payments
increase rate of additional contribution (percentage and flat)

guaranteed payments
variable-fund adjustment
money-market comparison

for additional contributions:
start date, stop date (actual or projected)
retirementDate

## More Notes:

Contributing years should be no more than combined workingYears, because you can only contribute
during years you are active. However, you may have contributed only the first few years of your active
period, or the last few years, which would make a big difference, except that any past performance 
should be captured in the balance, in which case we always just track from current age to termination age

## Ideas for UI:
Limitations 
1) Does not currently take into account participation in the Variable Trust Fund.
    The Variable Trust Fund in deliberately non-diversified across classes (no bonds, real estate, etc), it doesn't include a floor on losses, and it doesn't smooth the stock market volality. 
    On the other hand, its average adjustment 1986-2020 was 5.29% vs 3.35% for the Core fund, so it is outperforming. 
    Additionally you're participation in the Variable fund is fixed at 50%, and so you still get the benefits of the floor & smoothing on the 50% that is invested in the Core Fund.
2) Other unusual things that I'm not worrying about: 
    if you enter a survivor that isn't a spouse, and they're more than 10 years younger than you, different rules apply

## Form
### First Section
8. Birthday
    [date]
8. Spouse's(*) birthday:
    Can be non-spouse as long as they're no more than ten years younger than you
    [date] ( you can leave this blank if you're not married, or you don't want to include spousal retirement options)
8. What age do you plan to start collecting benefits?
    [55-75] (validate according to job category, etc)
### Second Section
First let's rule out some more complicated scenarios:
8. Have you worked more than one job category?
        [y/n]
8. Have you worked for two (or more) separate, non-connected periods of time?
        [y/n]

    Phew! That keeps things nice and simple:

8. What month & year did you start? (this can be in the future if you're considering a job)
    [month][year]

8. What category does this job fall into?
    [general, etc.]

8. So far you've worked for x years under WRS - how many MORE years do you think you'll work under WRS?
    [y] (pre-set with number of years until you collect benefits)
    
8. Summary:
        You [started/will start] working for a WRS employer in yyyy when you [were/are] x years old
        You [will work/worked] for a total of x years until [you were/you'll be] z.
        You [started/plan on] collecting benefits in yyyy when [you were/you'll be] z years old. 
        Does this seem right?
        [y/n]

8. Multiple categories or stints:
        If you've worked across multiple categories or stints, use this section to determine your correct numbers.
        [category][start month][start year] - [actively employed] OR [end month][end year]

8. What is the average annual salary of the highest three years of getting paid?
        Example: Your three higest paid years were $42,000, $42,000 and $36,000 - so you'd add those up, divide by three and enter in $40,000
        * If you worked part-time, you can multiply it out as if you were full-time (e.g. if you made $15,000 working half-time, enter $30,000)
        * You can feel free to make up a number if you think you'll get paid more in the future - we're not the IRS!


8. Additional Contributions:
        Did you know that you can permanently increase your retirement income by adding your own funds now while you're working? 
        Research has shown that retirement income makes people much happier than a large nest-egg, and in Wisconsin we're blessed with a very stable, fully-funded retirement system. 
        Use this section to determine how much you can juice your retirement income by contributing a little with each paycheck while you're working.

        If you've made any voluntary additional contributions to your retirement, what's the current balance?
        Monthly contribution amount:
        Increase this amount each year:
        Percentage growth: 4%
    
    Variable Fund Participation:
        Excess or Deficiency amount
        Money Purchase current balance
    
