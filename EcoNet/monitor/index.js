const fetch = require('node-fetch');
const moment = require('moment');

const host = 'econet-api.rheemcert.com';

const statusInterval = minutes(1);
const usageInterval = minutes(60);

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
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end(
                lastUsage.toString()
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

let currentStatus = '';
let lastUsage = '';
let cachedToken = '';

async function getToken() {
    if(cachedToken) {
        return cachedToken
    }

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
}

async function logStatus() {
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
}

async function getUsage() {
    const token = await getToken()

    const usageRes = await (
        await fetch('https://' + host + '/equipment/' + credentials.id + '/usage', {
        headers: {
            Accept: 'application/json, text/plain, */*',
            Authorization: 'Bearer ' + token
        },
    })).json();
    // console.log(usageRes.hours['2018-02-19T16:00:00.000']);
    console.log(usageRes.energyUsage.hours['2018-02-19T16:00:00.000']);
    console.log(usageRes.energyUsage.report.reports[0]);
    lastUsage = usageRes;
}

logStatus();
setInterval(logStatus, statusInterval);
getUsage();
// TODO: sync with clock - collect new stats on the hour.
setInterval(getUsage, usageInterval);
