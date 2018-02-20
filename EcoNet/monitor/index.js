const fetch = require('node-fetch');
const moment = require('moment');

const host = 'econet-api.rheemcert.com';

const statusInterval = minutes(4); // Heater seems to update every 4 minutes.
const usageInterval = minutes(4);

function minutes(m) {
    return m * 60 * 1000;
}

// Get credentials - synchronous, we're not going anywhere without them...
const fs = require('fs');
const path = process.cwd();
const credentials = JSON.parse(fs.readFileSync(path + '/credentials.json'));

// Serve graphs of operating history.
// TODO: respond appropriately when data is no available.

const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    switch (req.url) {
        case '/':
        case '/status':
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end(
                moment().format() + ' ' + currentStatus.name + '\n\n'
                + 'Mode: ' + currentStatus.mode + ' - '
                + (currentStatus.inUse ? 'Heating' : 'Idle') + '\n\n'
                + 'Upper Temp: ' + currentStatus.upperTemp.toFixed(2) + '\n'
                + 'Lowor Temp: ' + currentStatus.lowerTemp.toFixed(2) + '\n'
            );
            break;

        case '/usage':
            let usage = 'Last 24 hours:\n';

            let last24hoursKWh = 0;
            Object.keys(lastUsage.energyUsage.hours).forEach((key, index) => {
                last24hoursKWh += lastUsage.energyUsage.hours[key];
                usage += key + ': ' + lastUsage.energyUsage.hours[key].toFixed(3) + '\n';
            });

            usage += '\n\nLast month:\n';

            let last7daysKWh = 0;
            let lastMonthKWh = 0;
            let daysWithUsageThisWeek = 0;
            let daysWithUsageThisMonth = 0;

            Object.keys(lastUsage.energyUsage.days).forEach((key, index) => {
                // Note: it appears that only the last 30 days are stored.
                lastMonthKWh += lastUsage.energyUsage.days[key];
                if (index < 8) {
                    // Current day's usage is always 0.
                    last7daysKWh += lastUsage.energyUsage.days[key];
                    if (lastUsage.energyUsage.days[key]) {
                        daysWithUsageThisWeek++;
                    }
                }
                if (lastUsage.energyUsage.days[key]) {
                    daysWithUsageThisMonth++;
                }
                usage += key + ': ' + lastUsage.energyUsage.days[key].toFixed(3) + '\n';
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end(
                usage
                + 'Usage in last 24 hours: ' + last24hoursKWh.toFixed(3) + ' KWh\n'
                + 'Usage over last 7 days: ' + last7daysKWh.toFixed(3) + ' KWh\n'
                + 'Average over last week: ' + (last7daysKWh / daysWithUsageThisWeek).toFixed(3) + ' KWh\n'
                + 'Projected annual usage: ' + (last7daysKWh / daysWithUsageThisWeek * 365).toFixed(3) + ' KWh\n'
            );
            break;

        default:
            res.statusCode = 404;
            break;

    }

    // Log request.
    console.log(moment().format() + ' - R - ' +
        req.method + ' ' + req.url);
});

server.listen(port, hostname, () => {
    console.log(moment().format() +
        ` - S - Startup on http://${hostname}:${port}/`);
});

// Collect operating data.

let currentStatus = {};
let lastUsage = '';
let cachedToken = '';

async function getToken() {
    if(cachedToken) {
        return cachedToken
    }

    try {
        const loginRes = await (await fetch('https://' + host + '/auth/token', {
            method: 'POST',
            headers: {
                Accept: 'application/json, text/plain, */*',
                Authorization: 'Basic ' + credentials.authorization,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: 'username=' + credentials.username
            + '&password=' + credentials.password + '&grant_type=password'
        })).json();

        cachedToken = loginRes.access_token;

        return cachedToken;
    } catch (e) {
        console.log(moment().format() + ' - E - ' + e.message)
    }
}

async function logStatus() {
    try {
        const token = await getToken();

        const id = credentials.id;

        const equipRes = await (await fetch('https://' + host + '/equipment/' + id, {
            headers: {
                Accept: 'application/json, text/plain, */*',
                Authorization: 'Bearer ' + token
            },
        })).json();

        let log = moment().format();
        log += " - L - ";
        log += equipRes.mode;
        log += " - lower " + equipRes.lowerTemp.toFixed(2);
        log += " - upper " + equipRes.upperTemp.toFixed(2);
        log += " - ambient " + equipRes.ambientTemp.toFixed(2);
        log += " - ";
        ([
            "isLoadShiftOpted", "isLoadShedOpted",
            "isLoadShedActive", "isLoadShiftActive",
            "isEnabled", "isConnected", "isOnVacation", "hasCriticalAlert", "inUse"
        ]).forEach(flag => {
            if (equipRes[flag]) {
                log += flag + ' '
            }
        });
        console.log(log);

        currentStatus = equipRes;
    } catch (e) {
        console.log(moment().format() + ' - E - ' + e.message)
    }
}

async function getUsage() {
    try {
        const token = await getToken()

        const usageRes = await (
            await fetch('https://' + host + '/equipment/' + credentials.id + '/usage', {
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    Authorization: 'Bearer ' + token
                },
            })).json();

        lastUsage = usageRes;
    } catch (e) {
        console.log(moment().format() + ' - E - ' + e.message)
    }
}

logStatus();
setInterval(logStatus, statusInterval);
getUsage();
// TODO: sync with clock - collect new stats on the hour.
setInterval(getUsage, usageInterval);
