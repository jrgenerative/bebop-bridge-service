
import { DroneService } from 'bebop-bridge-shared';
import * as DroneServiceBebopEvents from './drone.service.bebop.events';
import { EventEmitter } from 'events';
import { Flightplan } from 'bebop-bridge-shared';
import * as bebop from "node-bebop";
import * as async from 'async';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

// TODO: need to set this somewhere:
//this._bebop.WifiSettings.outdoorSetting(1);
// this._bebop.PilotingSettings.maxAltitude(50);
// this._bebop.PilotingSettings.maxDistance(100);

export class DroneServiceBebop extends EventEmitter implements DroneService {

    private _bebop: any = null;
    private _noContactSince: number = 0;
    private _moveTimoutID: any = null;
    private _moveTimeout: number = 2000; // milliseconds

    private _jsftp = null;
    private _flightplanDirectory: string = 'internal_000/flightplans/'; // path relative to Bebop ftp root.
    private _flightplanFilename: string = 'flightPlan.mavlink';

    private _obsFlightplan: BehaviorSubject<Flightplan> = new BehaviorSubject(new Flightplan()); // initialize with empty, invalid flight plan

    constructor() {

        super();
        this._bebop = bebop.createClient();

        // Register to events of below objects and re-emit events from this class.
        DroneServiceBebopEvents.forwardEvents(this, this._bebop);

        // FTP setup
        // ==============================================

        let jsftp = require('jsftp');

        this._jsftp = new jsftp({
            host: '192.168.42.1', // bebop
            debugMode: true,
            port: 21, // defaults to 21 
            user: "anonymous", // defaults to "anonymous" 
            pass: "@anonymous" // defaults to "@anonymous" 
        });

        this._jsftp.socket.on('close', () => {
            console.log('Ftp socket closed.');
        });

        this._jsftp.on("error", (err) => {
            this.emit("error", err);
        });

        // Special events related to connection issues
        // ==============================================

        // On discovery error (no connection to Bebop)
        this._bebop._discoveryClient.on("error", (err: Error) => {
            err.message = "Drone connection error: " + err.message;
            this.emit("error", err);
        });

        // In case the udp socket emits an error
        this._bebop._d2cServer.on("error", (err: Error) => {
            this.emit("error", err);
        });

        // Start contact timer
        setInterval(() => {
            this.emit("contact", this._noContactSince);
            this._noContactSince += 1;
            if (this._noContactSince > 3600) {
                this._noContactSince = 3600; // max
            }
        }, 1000);
    }

    flightplan(): Observable<Flightplan> {
        return this._obsFlightplan;
    }

    connect() {
        console.log("Drone: connect");

        try {
            // Hack to prevent crash because of exception thrown in different thread from dgram socket if already bound.
            // this._d2cServer.bind(this.d2cPort) inside _bebop.connect() throws an error from dgram.js if internal socket already bound.
            let alreadyBound = false;
            try {
                this._bebop._d2cServer.address(); // if this works socket is already bound, otherwise exception is thrown.
                alreadyBound = true; // d2cServer socket has an address and port, its bound.
            } catch (err) { } // do nothing, alreadyBound = false;

            if (!alreadyBound) {
                this._bebop.connect(() => { // if fails, the _bebop._discoveryClient emits an error event.
                    this.emit("connected", true); // connection successfully established
                });
            }
            else {
                this.emit("connected", true); // connection was established already
            }
        }
        catch (err) {
            this.emit("error", err);
        }
    }

    takeoff() {
        console.log("Drone: taking off commanded.");
        this._bebop.takeoff(() => {
            this.emit("airborne");
        });
    }

    land() {
        console.log("Drone: landing commanded.");
        this._bebop.land(() => {
            this.emit("touchdown");
        });
    }

    pitch(angle: number): void {
        console.log("Drone: pitch @ " + angle);
        this.refreshSafetyStopTimeout();
        if (angle >= 0) {
            this._bebop.forward(Math.abs(angle));
        }
        else {
            this._bebop.backward(Math.abs(angle));
        }
    }

    roll(angle: number): void {
        console.log("Drone: roll @ " + angle);
        this.refreshSafetyStopTimeout();
        if (angle >= 0) {
            this._bebop.right(Math.abs(angle));
        }
        else {
            this._bebop.left(Math.abs(angle));
        }
    }

    yaw(speed: number): void {
        console.log("Drone: yaw @ " + speed);
        this.refreshSafetyStopTimeout();
        if (speed >= 0) {
            this._bebop.clockwise(Math.abs(speed));
        }
        else {
            this._bebop.counterClockwise(Math.abs(speed));
        }
    }

    lift(speed: number): void {
        console.log("Drone: lift @ " + speed);
        this.refreshSafetyStopTimeout();
        if (speed >= 0) {
            this._bebop.up(Math.abs(speed));
        }
        else {
            this._bebop.down(Math.abs(speed));
        }
    }

    level(): void {
        console.log("Drone: level");
        this._bebop.level();
    }


    startMission(): void {
        console.log("Drone: start mission");
        this._bebop.Mavlink.start("/data/ftp/internal_000/flightplans/flightPlan.mavlink", 0);
    }

    pauseMission(): void {
        console.log("Drone: pause mission");
        this._bebop.Mavlink.pause();
    }


    stopMission(): void {
        console.log("Drone: stop mission");
        this._bebop.Mavlink.stop();
    }


    /**
     * Upload a flight plan to the vehicle.
     * Before the upload is done, any file in the Bebop's flight plan directory is deleted. If this fails, an error is emitted.
     * The function triggers a 'flightplan' event by calling downloadFlightPlan after successfully uploading the flight plan.
     * The function is asynchronous and also emits a 'success' or 'error' event.
     * @param filename the absoulte filename from which to load the flight plan to be uploaded.
     */
    public uploadFlightplan(flightplan: Flightplan): void {
        console.log("Drone: upload flight plan " + flightplan.name);
        // Async series call which executes passed function in series, but itself is asynchronous -> 
        // 'done' function executed _after_ async.series call finished.
        async.series(
            [
                this.cleanupFlightplanDirectory.bind(this),
                this.storeFlightPlan.bind(this, flightplan)
            ],
            this.uploadFlightPlanDone.bind(this)
        );
    }

    /**
     * Download the current flight plan from the vehicle and emit a 'flightplan' event.
     * The function is asynchronous and emits a 'flightplan' or 'error' event.
     */
    public downloadFlightplan(): void {
        console.log("Drone: download flight plan");
        // Async series call which executes passed function in series, but itself is asynchronous -> 
        // 'done' function executed _after_ async.series call finished.
        async.series(
            [
                this.retrieveFlightplan.bind(this)
            ],
            this.downloadFlightPlanDone.bind(this)
        );
    }

    /**
     * Delete the current flight plan on the vehcile and emit a 'flightplan' event with an empty flight plan.
     * The function is asynchronous and emits a 'flightplan' or 'error' event.
     */
    public deleteFlightplan(): void {
        console.log("Drone: delete flight plan");
        async.series(
            [
                this.cleanupFlightplanDirectory.bind(this),
            ],
            this.deleteFlightPlanDone.bind(this)
        );
    }

    hadContact(): void {
        this._noContactSince = 0.0;
    }

    // =============================================================================

    /**
     * Set or refresh a timeout call to stop the drone.
     * This call is registered for manual control commands moving the drone.
     */
    refreshSafetyStopTimeout() {
        if (this._moveTimoutID) {
            clearTimeout(this._moveTimoutID);
        }
        this._moveTimoutID = setTimeout(this.level.bind(this), this._moveTimeout);
    }

    // Private
    // ==============================================================================================================

    private retrieveFlightplan(callback): void {
        let filename = this._flightplanDirectory + this._flightplanFilename;
        let str: string = "";
        this._jsftp.get(filename, function (err, socket) {
            if (err) {
                if (err.code === 550) {
                    // No flight plan available on vehicle
                    console.log('Drone: no flight plan available. Returning empty flight plan.');
                    callback(null, "");
                }
                else {
                    // Something else went wrong
                    console.error('Ftp error: retrieving file failed ' + err);
                    callback('retrieving file failed ' + err, null);
                }
                return;
            }
            socket.on("data", function (d) {
                str += d.toString();
            });
            socket.on("close", function (theErr) {
                if (theErr) {
                    console.error('Ftp error: retrieving file failed. ' + theErr);
                    callback('retrieving file failed. ' + theErr, null);
                }
                else {
                    // Success return content retrieved from ftp in 'str'
                    callback(null, str);
                }
            });
            socket.resume();
        });
    }

    private cleanupFlightplanDirectory(callback): void {
        console.log('Cleaning up flightplan directory ' + this._flightplanDirectory);
        this._jsftp.ls(this._flightplanDirectory, (err, res) => {
            if (res) {
                if (res.length === 0) {
                    // Nothing to do
                    console.log('flightplan directory is empty, nothing to clean-up.');
                    callback(null, null); // pass no error and no data
                }
                else {
                    // Delete each file
                    async.each(res, this.deleteFile.bind(this), callback);
                }
            }
            else {
                callback("listing directory " + this._flightplanDirectory + " failed", null); // pass error and no data
            }
        });
    }

    // Delete a file in Bebop's flightplan directory (ftp)
    private deleteFile(file, callback): void {
        console.log('Ftp: deleting ' + file.name);
        this._jsftp.raw('dele', this._flightplanDirectory + file.name, callback);
    }

    private storeFlightPlan(flightplan: Flightplan, callback): void {
        let buf = new Buffer(flightplan.mavlink, "utf-8");
        this._jsftp.put(buf, this._flightplanDirectory + this._flightplanFilename, function (err) {
            if (!err) {
                callback(null, flightplan); // pass no error but which file has been uploaded as data
            }
            else {
                callback(err, null); // pass error and no data
            }
        });
    }

    private uploadFlightPlanDone(err, data) {
        if (err) {
            console.error('Ftp error: ' + err);
            this.emit('error', new Error('Ftp error: ' + err));
        }
        else {
            console.log('Ftp: flight plan successfully installed.');
            this.downloadFlightplan(); // (!) trigger download event to emit 'flightplan' event. Decision to 're-download' after upload to be sure that what's emitted with 'flightplan' is coming from the vehicle.
            this.emit('success', 'Flight plan ' + data[1].name + ' uploaded.');
        }
    }

    private downloadFlightPlanDone(err, data) {
        if (err) {
            console.error('Ftp error: ' + err);
            this.emit('error', new Error('Ftp error: ' + err));
        }
        else if (data.length !== 1) {
            console.error('Ftp error: no valid flight plan data could be retrieved');
            this.emit('error', new Error('Ftp error: no valid flight plan data could be retrieved'));
        }
        else {
            console.log('Ftp: flight plan successfully retrieved.');
            this._obsFlightplan.next(new Flightplan(data[0]));
        }
    }

    private deleteFlightPlanDone(err, data) {
        if (err) {
            console.error('Ftp error: ' + err);
            this.emit('error', new Error('Ftp error: ' + err));
        }
        else {
            console.log('Ftp: flight plan successfully deleted.');
            this.downloadFlightplan(); // (!)
            this.emit('success', 'Flight plan successfully deleted.');
        }
    }

}

