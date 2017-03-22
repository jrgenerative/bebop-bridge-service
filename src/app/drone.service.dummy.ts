
import { DroneService } from 'bebop-bridge-shared';
import { Flightplan } from 'bebop-bridge-shared';
import { EventEmitter } from 'events';
import * as fs from "fs";
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

class MassStorageData {
    constructor(
        public size: number, // Megabytes
        public used_size: number) { // Megabytes
    }
}

class PositionData {
    constructor(
        public latitude: number, // decimal degrees, 500.0 if not available"
        public longitude: number, // decimal degrees, 500.0 if not available"
        public altitude: number // meters
    ) {
    }
}


/**
 * A Bebop mock-up for testing.
 */
export class DroneServiceDummy extends EventEmitter implements DroneService {

    private _bebop: FakeBebop;
    private _noContactSince: number = 0;
    private _moveTimoutID: any = null;
    private _moveTimeout: number = 2000; // milliseconds

    private _obsFlightplan: BehaviorSubject<Flightplan> = new BehaviorSubject(new Flightplan()); // initialize with empty, invalid flight plan

    constructor() {
        super();
        this._bebop = new FakeBebop();
        // On battery event
        this._bebop.on("battery", (data) => {
            this.hadContact();
            this.emit("battery-level", data);
        });

        // On drone connection quality event.
        // Is delivered in dBm:
        // -30 dBm  Amazing, 
        // -67 dBm  Very Good, 
        // -70 dBm  Okay
        // -80 dBm  Not Good
        // -90 dBm  Unusable
        this._bebop.on("WifiSignalChanged", (data) => {
            this.hadContact();
            this.emit("connection-quality", data); // dbm
        });
        // On flight plan status event.
        this._bebop.on("MavlinkFilePlayingStateChanged", (data) => {
            this.hadContact();
            this.emit("mission-execution-state-changed", data);
        });
        // On flight plan error state change.
        this._bebop.on("MavlinkPlayErrorStateChanged", (data) => {
            this.hadContact();
            this.emit("mission-error-state-changed", data);
        });
        // When moving.
        this._bebop.on("PositionChanged", (data) => {
            this.hadContact();
            this.emit("position-event", data);
            // logPos(data.latitude + ",\t" + data.longitude + ",\t" + data.altitude);
        });
        // GPS fix state
        this._bebop.on("GPSFixStateChanged", (data) => {
            this.hadContact();
            this.emit("gps-fix-state", data);
        });
        // Mass storage info
        this._bebop.on("MassStorageInfoStateListChanged", (data) => {
            this.hadContact();
            this.emit("mass-storage-used-size", data.used_size);
            this.emit("mass-storage-size", data.size);
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
        // Simulate also Bebop connection error behavior.
        try {
            this._bebop.connect(() => {
                this.hadContact();
                this.emit("connected", true);
            });
        }
        catch (err) {
            if (err instanceof Error) {
                err.message = "Drone connection error: " + err.message;
                this.emit("error", err);
            }
            else {
                this.emit("error", new Error("Drone connection error"));
            }
        }
    }

    takeoff() {
        console.log("Drone: taking off commanded.");
        this._bebop.takeoff(() => {
            this.hadContact();
            this.emit("airborne");
        });
    }

    land() {
        console.log("Drone: landing commanded.");
        this._bebop.land(() => {
            this.hadContact();
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
        // TODO: SIMULATE
        console.log("Drone: start mission");
    }

    pauseMission(): void {
        // TODO: SIMULATE
        console.log("Drone: pause mission");
    }

    stopMission(): void {
        // TODO: SIMULATE
        console.log("Drone: stop mission");
    }

    uploadFlightplan(flightplan: Flightplan) {
        console.log("Drone: install flight plan: " + flightplan.name);
        try {
            this._bebop.uploadFlightplan(flightplan);
            this.downloadFlightplan(); // (!) trigger download event to emit 'flightplan' event. Decision to 're-download' after upload to be sure that what's emitted with 'flightplan' is coming from the vehicle.
            this.emit('success', 'Flight plan ' + flightplan.name + ' uploaded.');
        }
        catch (err) {
            this.emit('error', new Error('Ftp error: ' + err));
        }
    }

    downloadFlightplan(): void {
        let fp: Flightplan = this._bebop.downloadFlightplan();
        this._obsFlightplan.next(fp);
    }

    deleteFlightplan(): void {
        this._bebop.deleteFlightplan();
        this.downloadFlightplan(); // (!)
        this.emit('success', 'Flight plan successfully deleted.');
    }

    public hadContact() {
        this._noContactSince = 0.0;
    }

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
}

// =====================================================================================

class FakeBebop extends EventEmitter {

    private _batteryLevel: number = 100;
    private _massStorageData: MassStorageData = null;
    private _positionData: PositionData = null;
    private _wifiSignalStrength: number = -63;
    private _isConnected: boolean = false;
    private _flightplan: string = ''; // must NOT be stored here in JSON.stringify format.

    constructor() {
        super();
        this._wifiSignalStrength = -63;
        this._massStorageData = new MassStorageData(32768, 0);
        this._positionData = new PositionData(47.468722, 8.274975, 2.0); // Baldegg
        // simulate battery use and emit 'battery' signal as Bebop does.
        setInterval(() => {
            if (this._batteryLevel > 0) {
                this._batteryLevel -= 1;
            }
            if (this._isConnected) {
                this.emit("battery", this._batteryLevel);
            }
        }, 8000);
        // simulate Bebop wifi signal from -90dbm to -30dbm
        setInterval(() => {
            this._wifiSignalStrength += Math.floor(Math.random() * 7) - 3;
            if (this._wifiSignalStrength < -90) {
                this._wifiSignalStrength = -90;
            }
            if (this._wifiSignalStrength > -30) {
                this._wifiSignalStrength = -30;
            }
            if (this._isConnected) {
                this.emit("WifiSignalChanged", this._wifiSignalStrength);
            }
        }, 7000);
        // Simulate a changing gps fix state which is 0 or 1 as a number.
        setInterval(() => {
            let rndNum = Math.round(Math.random());
            if (rndNum === 1) {
                this.emit("GPSFixStateChanged", true);
            }
            else {
                this.emit("GPSFixStateChanged", false);
            }
        }, 8000);
        // Simulate changing disk space
        setInterval(() => {
            if (this._massStorageData.used_size < this._massStorageData.size) {
                this._massStorageData.used_size += 100;
            }
            if (this._massStorageData.used_size > this._massStorageData.size) {
                this._massStorageData.used_size = this._massStorageData.size;
            }
            this.emit("MassStorageInfoStateListChanged", this._massStorageData);
        }, 7000);
        // Simulate position change event
        setInterval(() => {
            let rndBoolLat = Math.round(Math.random());
            let rndBoolLng = Math.round(Math.random());
            if (rndBoolLat === 1) {
                this._positionData.latitude += 0.00001;
            }
            else {
                this._positionData.latitude -= 0.00001;
            }
            if (rndBoolLng === 1) {
                this._positionData.longitude += 0.00001;
            }
            else {
                this._positionData.longitude -= 0.00001;
            }
            //console.log('position' + this._positionData.latitude + ' ' + this._positionData.longitude);
            this.emit("PositionChanged", this._positionData);
        }, 1000);

        // TODO: simulate:
        //this.emit("MavlinkFilePlayingStateChanged", data);
        //this.emit("MavlinkPlayErrorStateChanged", data);
    }

    /**
     * Emulate a connect call to bebop.
     * Bebop emits event and calls callback.
     */
    connect(callback) {
        if (this._isConnected) {
            // fixed in BebopDrone.ts. Reconnecting doesn't throw error anymore.  //throw new Error('Socket is already bound'); // simulate dgram.js socket already bound behavior.
        }
        this._isConnected = true;
        callback();
        this.emit("ready");
    }

    /**
     * Emulate takeoff command.
     * Bebop calls callback after taking off.
     */
    takeoff(callback) {
        setTimeout(() => {
            callback();
        }, 3000);
    }

    /**
     * Emulate landing command.
     * Bebop calls callback after landing complete.
     */
    land(callback) {
        setTimeout(() => {
            callback();
        }, 3000);
    }

    right(val: number) {
        console.log("Going right @ " + val);
    }

    left(val: number) {
        console.log("Going left @ " + val);
    }

    forward(val: number) {
        console.log("Going forward @ " + val);
    }

    backward(val: number) {
        console.log("Going backward @ " + val);
    }

    up(val: number) {
        console.log("Going up @ " + val);
    }

    down(val: number) {
        console.log("Going down @ " + val);
    }

    clockwise(val: number) {
        console.log("Yawing right @ " + val);
    }

    counterClockwise(val: number) {
        console.log("Yawing left @ " + val);
    }

    level(): void {
        console.log("Leveling");
    }

    /**
     * Throws error exception.
     */
    uploadFlightplan(flightplan: Flightplan) {
        this._flightplan = flightplan.mavlink;
    }

    downloadFlightplan(): Flightplan {
        return new Flightplan(this._flightplan); // empty string in case no flightplan available.
    }

    deleteFlightplan() {
        this._flightplan = '';
    }

}



