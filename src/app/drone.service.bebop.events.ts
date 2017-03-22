
import { DroneServiceBebop } from './drone.service.bebop';
import { EventEmitter } from 'events';

/**
 * Relay all necessary Bebop events to be emitted by bebopWrapper. Translate to application-specific
 * events instead of Bebop-specific events. 
 * Functions in this module translate from Bebop-specific events to events defined in the 
 * context of this application.
 */
export function forwardEvents(droneWrapper: DroneServiceBebop, drone: any) {

    // Error and Success events
    // 'success' is assumed to be a string.
    // 'error' is assumed to be a standard Error object.
    // ==============================================

    drone.on('error', (err: Error) => {
        droneWrapper.emit("error", err);
    });

    drone.on("success", (message: string) => {
        droneWrapper.emit("success", message);
    });

    // The structure of this function follows commands.json
    // from the node-bebop package. Each section corresponds
    // to a json section.

    // MediaRecordState
    // ==============================================

    drone.on("PictureStateChangedV2", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("picture-state", data);
    });

    drone.on("VideoStateChangedV2", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("video-state", data);
    });

    // PilotingState
    // ==============================================

    drone.on("FlatTrimChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("flattrim-event", data);
    });
    drone.on("FlyingStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("flying-state", data);
    });
    drone.on("AlertStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("alert-state", data);
    });
    drone.on("NavigateHomeStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("returnhome-state", data);
    });
    drone.on("PositionChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("position-event", data);
    });
    drone.on("SpeedChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("speed-event", data);
    });
    drone.on("AttitudeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("attitude-event", data);
    });
    drone.on("AutoTakeOffModeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autotakeoff-state", data);
    });
    drone.on("AltitudeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("altitude-event", data);
    });

    // PilotingEvent
    // ==============================================

    drone.on("moveByEnd", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("movement-event", data);
    });

    // NetworkState
    // ==============================================
    // TODO:
    // WifiScanListChanged
    // AllWifiScanChanged
    // WifiAuthChannelListChanged
    // AllWifiAuthChannelChanged

    //  PilotingSettingsState
    // ==============================================

    drone.on("MaxAltitudeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("max-altitude-state", data);
    });
    drone.on("MaxTiltChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("max-tilt-state", data);
    });
    drone.on("AbsolutControlChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("absolut-control-state", data);
    });
    drone.on("MaxDistanceChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("max-distance-state", data);
    });
    drone.on("NoFlyOverMaxDistanceChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("no-fly-over-max-distance-state", data);
    });
    drone.on("AutonomousFlightMaxHorizontalSpeed", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-max-horizontal-speed-state", data);
    });
    drone.on("AutonomousFlightMaxVerticalSpeed", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-max-vertical-speed-state", data);
    });
    drone.on("AutonomousFlightMaxHorizontalAcceleration", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-max-horizontal-acceleration-state", data);
    });
    drone.on("AutonomousFlightMaxVerticalAcceleration", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-max-vertical-acceleration-state", data);
    });
    drone.on("AutonomousFlightMaxRotationSpeed", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-max-rotation-speed-state", data);
    });
    drone.on("BankedTurnChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("bank-turn-state", data);
    });
    drone.on("MinAltitudeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("min-altitude-state", data);
    });
    drone.on("CirclingDirectionChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("circling-direction-state", data);
    });
    drone.on("CirclingRadiusChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("circling-radius-state", data);
    });
    drone.on("CirclingAltitudeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("circling-radius-state", data);
    });
    drone.on("PitchModeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("pitch-mode-state", data);
    });
    drone.on("LandingModeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("landing-mode-state", data);
    });

    //  SpeedSettingsState
    // ==============================================

    drone.on("MaxVerticalSpeedChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("max-vertical-speed-state", data);
    });
    drone.on("MaxRotationSpeedChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("max-rotation-speed-state", data);
    });
    // TODO: HullProtectionChanged
    drone.on("OutdoorChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("outdoor-state", data);
    });
    drone.on("MaxPitchRollRotationSpeedChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("max-pitch-roll-rotation-speed-state", data);
    });

    //  NetworkSettingsState
    // ==============================================
    // TODO
    // WifiSelectionChanged
    // wifiSecurityChanged
    // wifiSecurity

    //  SettingsState
    // ==============================================
    // ProductMotorVersionListChanged
    // ProductGPSVersionChanged
    // MotorErrorStateChanged
    // MotorSoftwareVersionChanged
    // MotorFlightsStatusChanged
    // MotorErrorLastErrorChanged
    // P7ID
    //
    //

    //  PictureSettingsState
    // ==============================================

    drone.on("PictureFormatChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("picture-format-state", data);
    });
    drone.on("AutoWhiteBalanceChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("auto-with-balance-state", data);
    });
    drone.on("ExpositionChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("exposition-state", data);
    });
    drone.on("SaturationChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("saturation-state", data);
    });
    drone.on("TimelapseChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("timelapse-state", data);
    });
    drone.on("VideoAutorecordChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("video-autorecord-state", data);
    });
    drone.on("VideoStabilizationModeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("video-stabilization-mode-state", data);
    });

    //  MediaStreamingState
    // ==============================================

    drone.on("MediaStreamingState", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("video-enabled-state", data);
    });

    //  GPSSettingsState
    // ==============================================

    drone.on("HomeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("home-state", data);
    });
    drone.on("ResetHomeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("reset-home-state", data);
    });
    drone.on("GPSFixStateChanged", (data: number) => {
        droneWrapper.hadContact();
        if (data === 1) {
            droneWrapper.emit("gps-fix-state", true);
        }
        else {
            droneWrapper.emit("gps-fix-state", false);
        }
    });
    drone.on("GPSUpdateStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("gps-update-state", data);
    });
    drone.on("HomeTypeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("home-type-state", data);
    });
    drone.on("ReturnHomeDelayChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("return-home-delay-state", data);
    });

    //  CameraState
    // ==============================================

    drone.on("Orientation", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("camera-orientation-state", data);
    });
    drone.on("defaultCameraOrientation", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("camera-default-orientation-state", data);
    });

    //  AntiflickeringState
    // ==============================================
    // electricFrequencyChanged
    // modeChanged

    //  GPSState
    // ==============================================

    drone.on("NumberOfSatelliteChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("number-of-satellites-state", data);
    });
    drone.on("HomeTypeAvailabilityChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("home-type-availability-state", data);
    });
    drone.on("HomeTypeChosenChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("home-type-chosen-state", data);
    });

    //  NetworkEvent
    // ==============================================

    drone.on("Disconnection", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("disconnection-event", data);
    });

    //  SettingsState
    // ==============================================

    drone.on("AllSettingsChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("all-settings-state", data);
    });
    drone.on("ResetChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("reset-state", data);
    });
    drone.on("ProductNameChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("name-state", data);
    });
    drone.on("ProductVersionChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("version-state", data);
    });
    // ProductSerialHighChanged
    // ProductSerialLowChanged
    // CountryChanged
    // AutoCountryChanged

    //  CommonState
    // ==============================================
    drone.on("AllStatesChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("all-states-state", data);
    });
    drone.on("BatteryStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("battery-state", data);
    });
     // On battery event
    drone.on("battery", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("battery-level", data);
    });
    // MassStorageStateListChanged
    drone.on("MassStorageInfoStateListChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("mass-storage-used-size", data.used_size);
        droneWrapper.emit("mass-storage-size", data.size); // in MBytes,  there is also data.used_size in MBytes, but see below MassStorageInfoRemainingListChanged
    });
    drone.on("CurrentDateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("current-date-state", data);
    });
    drone.on("CurrentTimeChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("current-time-state", data);
    });
    // drone.on("MassStorageInfoRemainingListChanged", (data) => { // not sure when emitted above MassStorageInfoRemainingListChanged is sufficient
    //     droneWrapper.hadContact();
    //     droneWrapper.emit("mass-storage-free-space", data.free_space); // in MBytes
    // });
    // On drone connection quality event.
    // Is delivered in dBm:
    // -30 dBm  Amazing, 
    // -67 dBm  Very Good, 
    // -70 dBm  Okay
    // -80 dBm  Not Good
    // -90 dBm  Unusable
    drone.on("WifiSignalChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("connection-quality", data.rssi); // dbm
    });
    // SensorsStatesListChanged
    // ProductModel
    // CountryListKnown

    //  OverHeatState
    // ==============================================

    drone.on("OverHeatChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("overheat-state", data.rssi); // dbm
    });
    drone.on("OverHeatRegulationChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("overheat-regulation-state", data);
    });

    //  Controller
    // ==============================================

    drone.on("isPiloting", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("piloting-state", data);
    });


    //  WifiSettingsState
    // ==============================================

    drone.on("outdoorSettingsChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("outdoor-settings-state", data);
    });

    //  MavlinkState
    // ==============================================

    drone.on("MavlinkFilePlayingStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("mission-execution-state", data);
    });
    drone.on("MavlinkPlayErrorStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("mission-error-state", data);
    });

    //  CalibrationState
    // ==============================================
    // MagnetoCalibrationStateChanged
    // MagnetoCalibrationRequiredState
    // MagnetoCalibrationAxisToCalibrateChanged
    // MagnetoCalibrationStartedChanged

    //  CameraSettingsState
    // ==============================================

    drone.on("CameraSettingsChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("camera-settings-state", data);
    });

    //  FlightPlanState
    // ==============================================

    drone.on("AvailabilityStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-availability-state", data.AvailabilityState);  // AvailabilityStateChanged // emits a number 0 for not available, 1 for available
    });
    drone.on("ComponentStateListChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-check-state", data);
    });

    //  FlightPlanEvent
    // ==============================================

    drone.on("StartingErrorEvent", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-starting-error-event", data);
    });
    drone.on("SpeedBridleEvent", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("autonomous-flight-speed-bridle-event", data);
    });

    //  AudioState
    // ==============================================

    drone.on("AudioStreamingRunning", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("audio-streaming-state", data);
    });

    //  HeadlightsState
    // ==============================================
    // TODO

    //  AccessoryState
    // ==============================================
    // SupportedAccessoriesListChanged
    // AccessoryConfigChanged
    // AccessoryConfigModificationEnabled

    //  ChargerState
    // ==============================================
    drone.on("MaxChargeRateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("max-charge-rate-state", data);
    });
    drone.on("CurrentChargeStateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("current-charge-rate-state", data);
    });
    drone.on("LastChargeRateChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("last-charge-rate-state", data);
    });
    drone.on("ChargingInfo", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("charging-state", data);
    });

    //  RunState
    // ==============================================
    
    drone.on("RunIdChanged", (data) => {
        droneWrapper.hadContact();
        droneWrapper.emit("run-id-state", data);
    });   

}