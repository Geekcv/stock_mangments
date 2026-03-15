const cron = require("node-cron");
function runAtEleven(fn) {

    cron.schedule("59 50 23 * * *", fn);
}
function runAt22(fn) {

    cron.schedule("59 50 22 * * *", fn);
}
function runAt10(fn) {

    cron.schedule("59 59 09 * * *", fn);
}
function runAt11(fn) {

    cron.schedule("59 59 10 * * *", fn);
}

// Weekly Every Monday at 11AM
function runWeeklyAt11(fn) {
    // cron.schedule("0 11 * * 1", fn);
     cron.schedule("57 15 * * 2", fn);

}

// Monthly Every 1st at 11AM
function runMonthlyAt11(fn) {
    // cron.schedule("0 11 1 * *", fn);
    cron.schedule("54 15 11 * *", fn);

}



module.exports = { "runCron": runAt10, "runCronforexpiry": runAtEleven, "runAt22": runAt22,"runAt11":runAt11,"runWeeklyAt11":runWeeklyAt11,"runMonthlyAt11":runMonthlyAt11};







