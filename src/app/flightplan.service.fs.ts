import { Flightplan, FlightplanService } from "bebop-bridge-shared";
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/catch';
import { ConnectableObservable } from 'rxjs/observable/ConnectableObservable';
import * as fs from 'fs-extra';

/**
 * An implementation of FlightplanService which stores flightplans on the 
 * local file system.
 */
export class FlightplanServiceFS implements FlightplanService {

    private _flightplanDirectory: string = 'assets/missions/';
    private _mavlinkSuffix: string = '.mavlink';
    private _obsFlightplanList: BehaviorSubject<string[]> = new BehaviorSubject([]); // initialize with empty flight plan list

    private _index: number = 0;

    constructor() {

    }

    public flightplanList(): Observable<string[]> {
        return this._obsFlightplanList;
    }

    /**
     * List mavlink ('*.mavlink) files contained in local flight plan directory and return the
     * filenames without .mavlink suffix.
     */
    public getFlightplanList(): Observable<string[]> {
        console.log("FlightplanService: listing flightplans.");
        return Observable.create((observer) => {
            let directory: string = __dirname + '/' + this._flightplanDirectory;
            fs.readdir(directory, (err: NodeJS.ErrnoException, filenames: string[]) => {
                if (err) {
                    let msg: string = 'Unable to read flight plans from ' + directory + '.';
                    console.error(msg);
                    observer.error(msg);
                }
                else {
                    let mavlinkFiles: string[] = [];
                    filenames.forEach((value: string) => {
                        if (this.stringEndsWith(value, this._mavlinkSuffix)) {
                            mavlinkFiles.push(value.substr(0, value.length - this._mavlinkSuffix.length)); // name is filename without suffix
                        }
                    });
                    observer.next(mavlinkFiles);
                    observer.complete();
                }
            });
        });
    }

    /**
     * Load a flight plan from disk.
     * @param name The name of the flight plan to load. Name and filename without .mavlink suffix need to correspond.
     */
    public loadFlightplan(name: string): Observable<Flightplan> {
        console.log("FlightplanService: loading flightplan " + name + " from disk.");
        return Observable.create((observer) => {
            let filename: string = __dirname + '/' + this._flightplanDirectory + name + '.mavlink';
            fs.readFile(filename, 'utf8', (err: NodeJS.ErrnoException, data: string) => {
                if (err) {
                    let msg: string = 'Unable to read flight plan from ' + filename + '.';
                    console.error(msg);
                    observer.error(msg);
                }
                else {
                    let fp = null;
                    try {
                        fp = new Flightplan(data);
                    }
                    catch (err) {
                        let msg: string = 'Unable to read flight plan from ' + filename + '. ' + err;
                        console.error(msg);
                        observer.error(msg);
                    }
                    if (fp) {
                        observer.next(fp);
                        observer.complete();
                    }
                }
            });
        });
    }

    /**
     * Store a flight plan to disk.
     * @param flightplan The flight plan to store. It's name is used as resulting filename.
     */
    public saveFlightplan(flightplan: Flightplan): Observable<void> {
        console.log("FlightplanService: saving flightplan " + flightplan.name + " to disk.");
        return Observable.create((observer) => {
            let filename: string = __dirname + '/' + this._flightplanDirectory + flightplan.name + '.mavlink';
            fs.writeFile(filename, flightplan.mavlink, (err: Error) => {
                if (err) {
                    let msg: string = 'Unable to write file to ' + filename + '.';
                    console.error(msg);
                    observer.error(msg);
                }
                else {
                    this.nextFlightplanList();
                    observer.next();
                    observer.complete();
                }
            });
        });
    }

    public deleteFlightplan(name: string): Observable<void> {
        console.log("FlightplanService: deleting flightplan " + name + " from disk.");
        return Observable.create((observer) => {
            let filename: string = __dirname + '/' + this._flightplanDirectory + name + '.mavlink';
            fs.unlink(filename, (err: Error) => {
                if (err) {
                    let msg: string = 'Unable to delete file ' + filename + '.';
                    console.error(msg);
                    observer.error(msg);
                }
                else {
                    this.nextFlightplanList();
                    observer.next();
                    observer.complete();
                }
            });
        });
    }

    // Private methods
    // ==================================================================

    /**
     * List flight plans and hand result to flight plan list observable as 'next'.
     */
    private nextFlightplanList() {
        this.getFlightplanList().subscribe(
            (names: string[]) => {
                this._obsFlightplanList.next(names);
            },
            (err: string) => {
                // Don't emit error on _obsFlightplanList (this._obsFlightplanList.error(...), this would terminate this observable.
               console.error('Ignoring error to list flight plans: ' + err);
            },
            () => { }
        );
    }

    private stringEndsWith(someString: string, suffix: string): boolean {
        return someString.indexOf(suffix, someString.length - suffix.length) !== -1;
    };

}