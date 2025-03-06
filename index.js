// Cloud Run Function entry point
import dotenv from 'dotenv';
import { optimizeRoute } from './optimization.js';
import { printOptimizationSummary } from './lib/aux.js';

// Initialize dotenv
dotenv.config();

/**
 * Transforms incoming request data to the format expected by the optimization algorithm
 * @param {Object} requestData - The request data in the customer format
 * @returns {Object} - Data transformed to match the algorithm's expected input format
 */
const transformRequestData = (requestData) => {
    // Define default parameters
    const stopTimeInMinutes = requestData.parameters?.STOP_TIME_IN_MINUTES || 2;
    const maxRouteTimeInMinutes = requestData.parameters?.MAX_ROUTE_TIME_IN_MINUTES || 90;
    
    // Transform bookings data
    const bookings = requestData.bookings.map((booking, index) => {
        // Get coordinates for the origin
        // In this example, we're using a simple mapping for common locations
        const originLocations = {
            "AMB Terminal 1": { latitude: -33.39733755598884, longitude: -70.79438713103244 },
            "AMB Terminal 2": { latitude: -33.39312201984877, longitude: -70.79180431908104 },
            // Add more common locations as needed
        };
        
        const originLocation = originLocations[booking.origin] || { 
            latitude: booking.origin_coordinates?.latitude,
            longitude: booking.origin_coordinates?.longitude
        };
        
        return {
            label: booking.job_id || `Booking ${index + 1}`,
            pickups: [{
                arrivalLocation: {
                    latitude: originLocation.latitude,
                    longitude: originLocation.longitude
                },
            }],
            deliveries: [{
                arrivalLocation: {
                    latitude: booking.destination.latitude,
                    longitude: booking.destination.longitude
                },
                duration: {
                    seconds: stopTimeInMinutes * 60
                }
            }],
            loadDemands: {
                passengers: {
                    amount: booking.pax_count
                }
            }
        };
    });
    
    // Transform vehicles data
    const vehicles = requestData.vehicles.map((vehicle, index) => {
        // Get coordinates for start location
        const startLocations = {
            "AMB Terminal 1": { latitude: -33.39733755598884, longitude: -70.79438713103244 },
            "AMB Terminal 2": { latitude: -33.39312201984877, longitude: -70.79180431908104 },
            // Add more locations as needed
        };
        
        const startLocation = startLocations[vehicle.start_location] || {
            latitude: vehicle.start_coordinates?.latitude,
            longitude: vehicle.start_coordinates?.longitude
        };
        
        return {
            label: vehicle.vehicle_number || `Vehicle ${index + 1}`,
            travelMode: "DRIVING",
            costPerHour: 40.0,
            costPerKilometer: 10.0,
            startLocation: {
                latitude: startLocation.latitude,
                longitude: startLocation.longitude
            },
            routeDurationLimit: {
                maxDuration: {
                    seconds: maxRouteTimeInMinutes * 60
                }
            },
            loadLimits: {
                passengers: {
                    maxLoad: vehicle.vehicle_capacity || 7
                }
            }
        };
    });
    
    return { bookings, vehicles };
};

/**
 * The main Cloud Run function handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const optimizeRouteFunction = async (req, res) => {
    try {
        // Log incoming request
        console.log('Received optimization request');
        
        // Validate request
        if (!req.body) {
            return res.status(400).send({
                error: 'Request body is required'
            });
        }
        
        if (!req.body.bookings || !Array.isArray(req.body.bookings) || req.body.bookings.length === 0) {
            return res.status(400).send({
                error: 'At least one booking is required'
            });
        }
        
        if (!req.body.vehicles || !Array.isArray(req.body.vehicles) || req.body.vehicles.length === 0) {
            return res.status(400).send({
                error: 'At least one vehicle is required'
            });
        }
        
        // Transform request data
        const { bookings, vehicles } = transformRequestData(req.body);
        
        // Run optimization
        const { 
            response, 
            routes, 
            visits_detail, 
            visits_api_response, 
            summary 
        } = await optimizeRoute(bookings, vehicles);
        
        // Format and send response
        const result = {
            status: 'success',
            metrics: response.metrics,
            summary: summary,
            routes: routes.map(route => ({
                vehicle: route.vehicleLabel,
                visits: route.visits.map(visit => ({
                    booking_id: bookings[visit.shipmentIndex]?.label,
                    sequence: visit.visitIndex,
                    arrival_time: visit.arrivalTime,
                    departure_time: visit.departureTime,
                    location: visit.isPickup ? 'pickup' : 'delivery'
                }))
            })),
            detailed_visits: visits_detail,
            api_response: visits_api_response
        };
        
        // Send response
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in route optimization function:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            details: error.details || 'No additional details available'
        });
    }
};

// Local testing entry point that simulates a Cloud Run request
export const localTest = async () => {
    // Sample request for testing
    const sampleRequest = {
        body: {
            "bookings": [
                {
                    "job_id": "12345",
                    "pax_count": 2,
                    "origin": "AMB Terminal 1",
                    "destination": {
                        "latitude": -33.4315156504583,
                        "longitude": -70.78452621008952
                    }
                },
                {
                    "job_id": "12346",
                    "pax_count": 2,
                    "origin": "AMB Terminal 1",
                    "destination": {
                        "latitude": -33.41911211912203,
                        "longitude": -70.5971284321036
                    }
                },
                {
                    "job_id": "12347",
                    "pax_count": 2,
                    "origin": "AMB Terminal 1",
                    "destination": {
                        "latitude": -33.43362718327786,
                        "longitude": -70.65767073210303
                    }
                }
            ],
            "vehicles": [
                {
                    "vehicle_number": "V001",
                    "start_location": "AMB Terminal 2",
                    "vehicle_capacity": 7
                }
            ],
            "parameters": {
                "STOP_TIME_IN_MINUTES": 2,
                "MAX_ROUTE_TIME_IN_MINUTES": 90
            }
        }
    };
    
    // Mock response object
    const mockResponse = {
        status: (code) => ({
            send: (data) => console.log('Response:', code, data),
            json: (data) => console.log('Response:', code, JSON.stringify(data, null, 2))
        })
    };
    
    // Call the function
    await optimizeRouteFunction(sampleRequest, mockResponse);
};

// Only run local test if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    localTest().catch(err => console.error('Local test error:', err));
} 