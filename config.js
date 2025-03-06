// Locations configuration
export const Locations = {
    Airports: {
        AMB: {
            General: { latitude: -33.39733755598884, longitude: -70.79438713103244 },
            T1: { latitude: -33.39721973343856, longitude: -70.79421409122048 },
            T2: { latitude: -33.39987559934955, longitude: -70.79395617562054 },
        },
        Private: {
            FBO: { latitude: -33.3975, longitude: -70.7950 },
            Aerocardal: { latitude: -33.3980, longitude: -70.7945 },
            Aviasur: { latitude: -33.3985, longitude: -70.7940 },
        }
    },
    Cities: {
        SCL: {
            General: { latitude: -33.44575475922058, longitude: -70.6724167138136 }
        }
    }
};

// General route optimization constants
export const MAX_ROUTE_TIME_IN_MINUTES = 90;
export const STOP_TIME_IN_MINUTES = 3;
export const VEHICLE_CAPACITY = 7;

// API configuration constants
export const API_CONFIG = {
    timeoutInMs: 60000,  // 60 seconds
    retryConfig: {
        initialRetryDelayMillis: 100,
        retryDelayMultiplier: 1.3,
        maxRetryDelayMillis: 60000,
        maxAttempts: 5
    },
    populateTransitionPolylines: true,
    populatePolylines: true,
    considerRoadTraffic: false,
};

// Booking token used in shipment labels
export const BOOKING_TOKEN = 'Booking'; 