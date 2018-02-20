const fetch = require('node-fetch');
const moment = require('moment');

const host = 'econet-api.rheemcert.com';
const minutesBetweenSamples = 1;
const sampleInterval = minutesBetweenSamples * 60 * 1000;

// Get credentials
const fs = require('fs');
const path = process.cwd();
const credentials = JSON.parse(fs.readFileSync(path + '/credentials.json'));

// Serve graphs of operating history.
// TODO: respond appropriately when data is no available.

const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(
        moment().format() + ' ' + currentStatus.name + '\n\n'
        + 'Mode: ' + currentStatus.mode + ' - '
        + (currentStatus.inUse ? 'Heating' : 'Idle') + '\n\n'
        + 'Upper Temp: ' + currentStatus.upperTemp.toFixed(2) + '\n'
        + 'Lowor Temp: ' + currentStatus.lowerTemp.toFixed(2) + '\n'
    );

    // Log request.
    console.log(moment().format() + ' - R - ' +
        req.method + ' ' + req.url);
});

server.listen(port, hostname, () => {
    console.log(moment().format() +
        ` - S - Startup on http://${hostname}:${port}/`);
});

// Collect operating data.

var currentStatus;

async function logStatus() {

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

    const token = loginRes.access_token;
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

logStatus();
setInterval(logStatus, sampleInterval);
