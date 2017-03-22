import * as url from "url";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as socketio from 'socket.io';
import { DroneService, createDroneService } from "bebop-bridge-shared";
import { DroneServiceBebop } from "./drone.service.bebop";
import { DroneServiceDummy } from "./drone.service.dummy";
import { Flightplan } from "bebop-bridge-shared";
import { FlightplanService, createFlightplanService } from "bebop-bridge-shared";
import { FlightplanServiceFS } from "./flightplan.service.fs";
//import * as logger from "morgan"; // HTTP request logger middleware for node.js
import * as path from "path"; // path = require('path');
import * as methodOverride from "method-override";
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/retryWhen';
import 'rxjs/add/operator/do';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/delay';

class DroneControlResponse {
    constructor(public message: string = "") {
    }
}

class BridgeResponse {
    constructor(public message: string = "") {
    }
}

// Setup express and socket.io
let port: number = process.env.PORT || 4000;
let app = express();

// TODO: To watch and recompile on changes. Compilation works on changes, but new in-memory version not 're-served' changes not effective ins served content.
// // TODO if DEBUG (include function only in debug mode)
// (function () {
//     //Create & configure a webpack compiler
//     let webpack = require('webpack');
//     let webpackConfig = require('../../config/webpack.config.dev')();
//     console.log('public path: ' + webpackConfig.output.publicPath);
//     let compiler = webpack(webpackConfig);
//     // Attach the dev middleware to the compiler & the server
//     app.use(require("webpack-dev-middleware")(compiler, {
//         noInfo: false,
//         publicPath: webpackConfig.output.publicPath
//     }));
// //     //Attach the hot middleware to the compiler & the server (don't think this is required for now..)
// //     app.use(require("webpack-hot-middleware")(compiler, {
// //         log: console.log, 
// //         path: '/__webpack_hmr', 
// //         heartbeat: 10 * 1000
// //     }));
// })();

let server = require('http').Server(app); // something missing in typings? Cannot make this work using the http returned from "import * as http from "http"".
let io = socketio(server);

// Instantiate a flightplan service;
let flightplanService: FlightplanService = createFlightplanService(FlightplanServiceFS);

// Instantiate a drone implementation
// ============================================================================================
let drone = null;
// Implementation specified via argument (first argument e.g.: 'node app.js dummy')
if (drone === null && process.argv.length > 2) {
    if (process.argv[2].toLowerCase() === 'dummy') {
        console.log('Instantiating \'dummy\' vehicle implementation.');
        drone = createDroneService(DroneServiceDummy);
    }
    else if (process.argv[2].toLowerCase() === 'bebop') {
        console.log('Instantiating \'bebop\' vehicle implementation.');
        drone = createDroneService(DroneServiceBebop);
    }
    else {
        console.log('No vehicle implementation with name \'' + process.argv[3] + '\' found.');
        process.exit(1);
    }
}
// Implementation specified via env variable 'DRONE'
if (drone === null && process.env.DRONE) {
    if (process.env.DRONE === 'dummy') {
        console.log('Instantiating \'dummy\' vehicle implementation.');
        drone = createDroneService(DroneServiceDummy);
    }
    else if (process.env.DRONE === 'bebop') {
        console.log('Instantiating \'bebop\' vehicle implementation.');
        drone = createDroneService(DroneServiceBebop);
    }
    else {
        console.log('No vehicle implementation with name \'' + process.env.DRONE + '\' found.');
        process.exit(1);
    }
}
// Default
if (drone === null) {
    console.log('Instantiating \'Bebop\' vehicle implementation.');
    drone = createDroneService(DroneServiceBebop);
}
// ===============================================================================================

// Socket.io events from the vehicle
// Connects the drone service interface
let ioDroneDownlink = io.of('/control/downlink'); // socket namespace for vehicle downlink
ioDroneDownlink.on('connection', () => {
    console.log('Someone connected to the vehicle downlink.');
});

// Socket.io events from the back-end
// Connects the flightplan service interface
let ioBridgeDownlink = io.of('/bridge/downlink'); // socket namespace for bridge downlink
ioBridgeDownlink.on('connection', () => {
    console.log('Someone connected to the bridge downlink.');
});

// Vehicle events
// ===================================================================================

drone.on("error", (err: Error) => {
    ioDroneDownlink.emit('error', err.message);
});
drone.on("success", (message) => {
    ioDroneDownlink.emit('success', message);
});
drone.on("contact", (noContactSinceSeconds) => {
    ioDroneDownlink.emit('contact', noContactSinceSeconds);
});
drone.on("connected", (data) => {
    ioDroneDownlink.emit('connected', data);
});
drone.on("airborne", () => {
    ioDroneDownlink.emit('airborne');
});
drone.on("touchdown", () => {
    ioDroneDownlink.emit('touchdown');
});
drone.on("battery-level", (data) => {
    ioDroneDownlink.emit('battery-level', data);
});
drone.on("connection-quality", (data) => {
    ioDroneDownlink.emit('connection-quality', data);
});
drone.on("gps-fix-state", (data: boolean) => {
    ioDroneDownlink.emit('gps-fix-state', data);
});

// Position
drone.on("position-event", (data: any) => {
    //console.log('position' + ' ' + data.latitude + ' ' + data.longituded + ' ' + data.altitude);
    ioDroneDownlink.emit('position-event', data); // data.latitude, data.longitude, data.altitude
});

// Events related to mission / flightplan readyness
drone.on("mission-error-state", (data) => {
    ioDroneDownlink.emit('mission-error-state', data);
});
drone.on("mission-execution-state", (data) => {
    // data.state == 'stopped' // e.g. map to number?
    ioDroneDownlink.emit('mission=-execution-state', data);
});
drone.on("autonomous-flight-availability-state", (data) => {
    // a number
    ioDroneDownlink.emit('autonomous-flight-availability-state', data);
});
drone.on("autonomous-flight-check-state", (data) => {
    // data.component // string, // data.State // number
    ioDroneDownlink.emit('autonomous-flight-check-state', data); // ComponentStateListChanged, 
});
drone.on("mass-storage-size", (data) => {
    ioDroneDownlink.emit('mass-storage-size', data);
});
drone.on("mass-storage-used-size", (data) => {
    ioDroneDownlink.emit('mass-storage-used-size', data);
});

// ===================================================================================

// Configuration
//app.use(logger('dev')); need morgan typings
app.use(cors()); // enable Cross-Origin Resource Sharing for all routes.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(bodyParser.text()); // TODO need this?
app.use(methodOverride('X-HTTP-Method-Override'));
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(express.static(path.join(__dirname, 'public')));

// If hitting the fan
// ===================================================================================

// Log any emitted 'error' event.
process.on('uncaughtException', function (err) {
    console.error('uncaught exception:', err.stack || err);
});

// Clean-up once if 'error' event(s) occur.
process.once('uncaughtException', function (err) {
    // take some clean-up action here if desired.
    console.error("Terminating process...");
    process.exit(1); // see YLD FlowControl Pedro Teixeira Section 6.2.1.
});

// Vehicle control end point implementation
// ===================================================================================

let connect = (req: express.Request, res: express.Response, next) => {
    drone.connect();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to connect")));
    // var err = new Error('No connection to Bebop. Unable to take-off.');
    // return next(err);s
};

let takeoff = (req: express.Request, res: express.Response, next) => {
    drone.takeoff();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to takeoff")));
    // var err = new Error('No connection to Bebop. Unable to take-off.');
    // return next(err);
};

let land = (req: express.Request, res: express.Response, next) => {
    drone.land();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to land")));
};

let pitch = (req: express.Request, res: express.Response, next) => {
    drone.pitch(req.body.value);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to pitch to angle " + req.body.value)));
};

let roll = (req: express.Request, res: express.Response, next) => {
    drone.roll(req.body.value);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to roll to angle " + req.body.value)));
};

let yaw = (req: express.Request, res: express.Response, next) => {
    drone.yaw(req.body.value);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to yaw with speed " + req.body.value)));
};

let lift = (req: express.Request, res: express.Response, next) => {
    drone.lift(req.body.value);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to change lift with speed " + req.body.value)));
};

let level = (req: express.Request, res: express.Response, next) => {
    drone.level();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to level")));
};

let startMission = (req: express.Request, res: express.Response, next) => {
    drone.startMission();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to start mission")));
};

let pauseMission = (req: express.Request, res: express.Response, next) => {
    drone.pauseMission();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to pause mission")));
};

let stopMission = (req: express.Request, res: express.Response, next) => {
    drone.stopMission();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to stop mission")));
};

let uploadFlightplan = (req: express.Request, res: express.Response, next) => {
    flightplanService.loadFlightplan(req.body.value).subscribe(
        data => {
            drone.uploadFlightplan(data);
        },
        err => {
            ioDroneDownlink.emit('error', err);
        },
        () => { }
    );
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to upload flight plan " + req.body.value)));
};

let downloadFlightplan = (req: express.Request, res: express.Response, next) => {
    drone.downloadFlightplan();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to download flight plan")));
};

let deleteFlightplan = (req: express.Request, res: express.Response, next) => {
    drone.deleteFlightplan();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(new DroneControlResponse("Successfully requested to delete flight plan")));
};

/**
 * Emit flightplan events and errors.
 */
drone.flightplan()
.subscribe(
    (fp: Flightplan) => {
        ioDroneDownlink.emit('flightplan', fp);
    },
    (err: string) => {
        ioDroneDownlink.emit('flightplan-error', err);
    },
    () => { }
);

// Bridge end point implementation
// ===================================================================================

/**
 * Emit flight plan list events and errors.
 */
flightplanService.flightplanList()
.subscribe(
    (names: string[]) => {
        ioBridgeDownlink.emit('flightplan-list', names);
    },
    (err: string) => {
        ioBridgeDownlink.emit('flightplan-list-error', err);
    },
    () => { }
);

/**
 * Handle request for listing flight plans.
 * @param req 
 * @param res 
 * @param next 
 */
let getFlightplanList = (req: express.Request, res: express.Response, next) => {
    flightplanService.getFlightplanList().subscribe(
        data => {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data));
        },
        err => {
            res.setHeader('Content-Type', 'application/json');
            res.status(500).send(JSON.stringify('Could not list flight plans.'));
        },
        () => { }
    );
};

/**
 * Handle flight plan save request.
 * @param req 
 * @param res 
 * @param next 
 */
let saveFlightplanOnBridge = (req: express.Request, res: express.Response, next) => {
    let flightplan: Flightplan = new Flightplan(req.body._mavlink);
    flightplanService.saveFlightplan(flightplan).subscribe(
        data => {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data));
        },
        err => {
            res.setHeader('Content-Type', 'application/json');
            res.status(500).send(JSON.stringify('Could not save flight plan.'));
        },
        () => { }
    );
};

/**
 * Handle flight plan deletion request.
 */
let deleteFlightplanFromBridge = (req: express.Request, res: express.Response, next) => {
    let name: string = req.body.name;
    flightplanService.deleteFlightplan(name).subscribe(
        data => {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data));
        },
        err => {
            res.setHeader('Content-Type', 'application/json');
            res.status(500).send(JSON.stringify('Could not delete flight plan.'));
        },
        () => { }
    );
};

// Control API
// ===================================================================================
app.post('/control/connect', connect);
app.post('/control/takeoff', takeoff);
app.post('/control/land', land);
app.post('/control/pitch', pitch);
app.post('/control/roll', roll);
app.post('/control/yaw', yaw);
app.post('/control/lift', lift);
app.post('/control/level', level);
app.post('/control/start-mission', startMission);
app.post('/control/pause-mission', pauseMission);
app.post('/control/stop-mission', stopMission);
app.post('/control/upload-flightplan', uploadFlightplan);
app.get('/control/download-flightplan', downloadFlightplan);
app.post('/control/delete-flightplan', deleteFlightplan);

// Flight plan service API
// ===================================================================================
app.get('/bridge/list-flightplans', getFlightplanList);
app.post('/bridge/save-flightplan', saveFlightplanOnBridge);
app.post('/bridge/delete-flightplan', deleteFlightplanFromBridge);

// ===========================================================

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    //res.status(404);
    next(err);
});

// // log errors and pass to next error handler
// app.use(function (req, res, next) {
//     console.error(err.);
//     next(err);
// });

// catch-all and send reply
app.use(function (req, res) {
    res.render('404',
        { locals: { 'title': 'Not Found' }, },
        function (err, str) {
            res.send(404, str);
        });
});

// ============================================================================

server.listen(port, function () {
    let host = server.address().address;
    let port = server.address().port;
    console.log('This express app is listening on:' + host + ':' + port);
});

export let App = app;




