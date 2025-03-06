import { v1 } from '@googlemaps/routeoptimization';
import { 
    buildOptimizationSummary, 
    createVisitsAPIResponse, 
    getVisitsDetail 
} from './lib/aux.js';
import { API_CONFIG } from './config.js';
import { dateToGoogleFormat } from './lib/utils.js';

const { RouteOptimizationClient } = v1;

/**
 * Create and configure a Google Maps Route Optimization client
 * @returns {Object} Configured RouteOptimizationClient
 */
export const createOptimizationClient = () => {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    if (!projectId) {
        throw new Error('GOOGLE_PROJECT_ID environment variable is not set. Please set it before running the application.');
    }
    
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    
    if (!clientEmail) {
        throw new Error('GOOGLE_CLIENT_EMAIL environment variable is not set. Please set it before running the application.');
    }
    
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error('GOOGLE_PRIVATE_KEY environment variable is not set. Please set it before running the application.');
    }
    
    const credentials = {
        projectId: projectId,
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n')
    };

    return new RouteOptimizationClient({
        credentials: credentials,
        apiEndpoint: 'routeoptimization.googleapis.com'
    });
};

/**
 * Perform route optimization using the Google Maps API
 * @param {Array} bookings - Array of booking objects
 * @param {Array} vehicles - Array of vehicle objects
 * @param {Object} options - Optional configuration parameters
 * @returns {Object} Optimization results
 */
export async function optimizeRoute(bookings, vehicles, options = {}) {
    const client = createOptimizationClient();
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    // Default dates if not provided in options
    const startDate = options.startDate || new Date();
    const endDate = options.endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Default: startDate + 24h
    
    // Configure the optimization request
    const request = {
        parent: `projects/${projectId}`,
        model: {
            shipments: bookings,
            vehicles: vehicles,
            globalStartTime: dateToGoogleFormat(startDate),
            globalEndTime: dateToGoogleFormat(endDate),
        },
        populateTransitionPolylines: API_CONFIG.populateTransitionPolylines,
        populatePolylines: API_CONFIG.populatePolylines,
        considerRoadTraffic: options.considerRoadTraffic !== undefined ? 
            options.considerRoadTraffic : API_CONFIG.considerRoadTraffic,
    };

    try {
        // Send the optimization request
        const [response] = await client.optimizeTours(request, {
            timeout: API_CONFIG.timeoutInMs,
            retry: API_CONFIG.retryConfig
        });

        // Process and return results
        return {
            response,
            routes: response.routes,
            visits_detail: getVisitsDetail(bookings, response.routes, options.includePickups),
            visits_api_response: createVisitsAPIResponse(bookings, response.routes),
            summary: buildOptimizationSummary(response)
        };
    } catch (error) {
        console.error('Error in route optimization:', {
            code: error.code,
            message: error.message,
            details: error.details,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Perform route optimization using a complete, pre-configured model
 * @param {Object} model - Complete optimization model
 * @param {Object} options - Optional configuration parameters
 * @returns {Object} Optimization results
 */
export async function optimizeRouteWithModel(model, options = {}) {
    const client = createOptimizationClient();
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    // Configure the optimization request
    const request = {
        parent: `projects/${projectId}`,
        model: model,
        populateTransitionPolylines: API_CONFIG.populateTransitionPolylines,
        populatePolylines: API_CONFIG.populatePolylines,
        considerRoadTraffic: options.considerRoadTraffic !== undefined ? 
            options.considerRoadTraffic : API_CONFIG.considerRoadTraffic,
    };

    try {
        // Send the optimization request
        const [response] = await client.optimizeTours(request, {
            timeout: API_CONFIG.timeoutInMs,
            retry: API_CONFIG.retryConfig
        });

        // Process and return results
        return {
            response,
            routes: response.routes,
            visits_detail: getVisitsDetail(model.shipments, response.routes, options.includePickups),
            visits_api_response: createVisitsAPIResponse(model.shipments, response.routes),
            summary: buildOptimizationSummary(response)
        };
    } catch (error) {
        console.error('Error in route optimization with model:', {
            code: error.code,
            message: error.message,
            details: error.details,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Simplified optimization function that just returns the raw API response
 * @param {Array} bookings - Array of booking objects
 * @param {Array} vehicles - Array of vehicle objects
 * @param {Object} options - Optional configuration parameters
 * @returns {Object} Raw API response and processed visit details
 */
export async function optimizeRoutesAPI(bookings, vehicles, options = {}) {
    const client = createOptimizationClient();
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    // Default dates if not provided in options
    const startDate = options.startDate || new Date();
    const endDate = options.endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Default: startDate + 24h
    
    // Configure the optimization request
    const request = {
        parent: `projects/${projectId}`,
        model: {
            shipments: bookings,
            vehicles: vehicles,
            globalStartTime: dateToGoogleFormat(startDate),
            globalEndTime: dateToGoogleFormat(endDate),
        },
        populateTransitionPolylines: false, // Simpler response
        populatePolylines: true,
        considerRoadTraffic: options.considerRoadTraffic !== undefined ? 
            options.considerRoadTraffic : true,
    };

    try {
        // Send the optimization request
        const [response] = await client.optimizeTours(request, {
            timeout: API_CONFIG.timeoutInMs,
            retry: API_CONFIG.retryConfig
        });

        return {
            response,
            visits_detail: getVisitsDetail(bookings, response.routes, options.includePickups),
        };
    } catch (error) {
        console.error('Error in API route optimization:', {
            code: error.code,
            message: error.message,
            details: error.details,
            stack: error.stack
        });
        throw error;
    }
} 