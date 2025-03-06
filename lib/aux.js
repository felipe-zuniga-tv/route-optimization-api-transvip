import { BOOKING_TOKEN, MAX_ROUTE_TIME_IN_MINUTES, VEHICLE_CAPACITY } from '../config.js';

/**
 * Extracts booking ID from a shipment label
 * @param {Object} visit - Visit object containing shipmentLabel
 * @returns {number} The booking ID or -1 if not found
 */
export const getBookingIDFromShipment = (visit) => {
    if (!visit) return -1;
    return visit.shipmentLabel.includes(BOOKING_TOKEN) ?
        parseInt(visit.shipmentLabel.replace(BOOKING_TOKEN, '').trim()) :
        parseInt(visit.shipmentLabel.trim());
};

/**
 * Finds the booking reference that matches a visit
 * @param {Array} bookings - Array of booking objects
 * @param {Object} visit - Visit object to find matching booking for
 * @returns {Object} Object containing booking reference and coordinates
 */
export const getReferenceBooking = (bookings, visit) => {
    const ref_booking = bookings.filter(b => b.label === visit.shipmentLabel)[0];
    
    if (!ref_booking) {
        throw new Error(`No booking found with label: ${visit.shipmentLabel}`);
    }

    const ref_booking_origin_coordinates = {
        latitude: ref_booking.pickups[0].arrivalLocation.latitude,
        longitude: ref_booking.pickups[0].arrivalLocation.longitude
    };
    const ref_booking_destination_coordinates = {
        latitude: ref_booking.deliveries[0].arrivalLocation.latitude,
        longitude: ref_booking.deliveries[0].arrivalLocation.longitude
    };

    return {
        ref_booking,
        ref_booking_origin_coordinates,
        ref_booking_destination_coordinates
    };
};

/**
 * Calculate cumulative distances for each visit
 * @param {Array} dropoff_visits - Array of visits (dropoffs)
 * @param {Array} transitions - Array of transitions between visits
 * @returns {Object} Object with booking IDs as keys and distance information as values
 */
export const getCumulativeDistances = (dropoff_visits, transitions) => {
    let cumulativeDistance = 0;
    const distancesByVisit = {};

    dropoff_visits.forEach((visit, index) => {
        // Find transition that matches its start time + total duration with the Visit start time
        const matchingTransitions = transitions.filter(t => 
            parseInt(t.startTime.seconds) + parseInt(t.totalDuration.seconds) === parseInt(visit.startTime.seconds)
        );
        const transition = matchingTransitions[0];

        // Calculate cumulative distance
        if (transition) {
            cumulativeDistance += transition.travelDistanceMeters;
            distancesByVisit[getBookingIDFromShipment(visit)] = {
                visitIndex: index,
                distanceMeters: cumulativeDistance
            };
        }
    });

    return distancesByVisit;
};

/**
 * Calculates travel time for a visit in minutes
 * @param {Object} visit - Visit object
 * @returns {number} Travel time in minutes or -1 if visit is not valid
 */
export const getVisitTravelTime = (visit) => {
    if (!visit) return -1;
    return Math.round(parseInt(visit.startTime.seconds) / 60);
};

/**
 * Calculates total passengers along a route
 * @param {Object} route - Route object containing visits
 * @returns {number} Total number of passengers
 */
export const getPassengersAlongRoute = (route) => {
    if ((!route || !route.visits)) return 0;

    // Sum only positive passenger loads (pickups not dropoffs)
    const totalPassengers = route.visits
        .map(visit => parseInt(visit.loadDemands.passengers.amount))
        .filter(count => count > 0)
        .reduce((sum, count) => sum + count, 0);

    return totalPassengers;
};

/**
 * Gets passenger count for a visit
 * @param {Object} visit - Visit object 
 * @param {boolean} pickup - Whether this is a pickup (true) or dropoff (false)
 * @returns {number} Positive count for pickup, negative for dropoff
 */
export const getPassengersVisit = (visit, pickup) => {
    return visit.loadDemands.passengers.amount * (pickup ? 1 : -1);
};

/**
 * Creates detailed visit information for all routes
 * @param {Array} bookings - Array of booking objects 
 * @param {Array} routes - Array of route objects
 * @param {boolean} pickup - Whether to include pickup visits (true) or dropoff visits (false)
 * @returns {Array} Array of route objects with detailed visit information
 */
export const getVisitsDetail = (bookings, routes, pickup = false) => {
    return routes.map((route, index) => {
        // Filter for pickup or dropoff visits based on parameter
        const pickup_visits = route.visits.filter(v => v.isPickup);
        const dropoff_visits = route.visits.filter(v => !v.isPickup);
        const _visits = pickup ? pickup_visits : dropoff_visits;
        const cumulativeDistances = getCumulativeDistances(dropoff_visits, route.transitions);

        return {
            vehicle: route.vehicleLabel,
            visits: _visits.map((visit, visit_index) => {
                const { 
                    ref_booking_origin_coordinates, 
                    ref_booking_destination_coordinates 
                } = getReferenceBooking(bookings, visit);
                
                const bookingId = getBookingIDFromShipment(visit);
                const cumulativeDistance = cumulativeDistances[bookingId];

                return {
                    route_number: index + 1,
                    visit_index: visit_index,
                    booking_id: bookingId,
                    origin: {
                        lat: ref_booking_origin_coordinates.latitude,
                        lng: ref_booking_origin_coordinates.longitude
                    },
                    destination: {
                        lat: ref_booking_destination_coordinates.latitude,
                        lng: ref_booking_destination_coordinates.longitude,
                    },
                    distance: cumulativeDistance?.distanceMeters || 0,
                    travel_time: getVisitTravelTime(visit),
                    pax_count: getPassengersVisit(visit, pickup)
                };
            }),
            polyline: route.routePolyline ? route.routePolyline.points : null,
        };
    });
};

/**
 * Builds a summary of the optimization results
 * @param {Object} response - Optimization API response
 * @returns {Object} Summary object with route statistics
 */
export const buildOptimizationSummary = (response) => {
    const output = {};
    const routes = response.routes;

    output.total_routes = routes.length;
    output.routes = [];
    
    routes.forEach((route, index) => {
        if (!route.metrics) return;

        output.routes.push({
            route_number: index + 1,
            total_stops: route.visits.filter(v => !v.isPickup).length,
            total_pickups: route.visits.filter(v => v.isPickup).length,
            total_dropoffs: route.visits.filter(v => !v.isPickup).length,
            vehicle_label: route.vehicleLabel,
            total_passengers: getPassengersAlongRoute(route),
            vehicle_capacity: VEHICLE_CAPACITY,
            stats: {
                total_travel_time_minutes: (parseInt(route.metrics.travelDuration.seconds) / 60).toFixed(2),
                total_stops_time_minutes: (parseInt(route.metrics.visitDuration.seconds) / 60).toFixed(2),
                total_route_time_minutes: (parseInt(route.metrics.totalDuration.seconds) / 60).toFixed(2),
                total_route_distance_mts: route.metrics.travelDistanceMeters,
                max_route_time_minutes: MAX_ROUTE_TIME_IN_MINUTES
            }
        });
    });

    return output;
};

/**
 * Prints a summary of optimization results to console
 * @param {Object} output - Summary object from buildOptimizationSummary
 */
export const printOptimizationSummary = (output) => {
    console.log(`-`.repeat(50));
    console.log(`# Total de Rutas: ${output.total_routes}`);
    console.log(`-`.repeat(50));

    output.routes.forEach((route) => {
        console.log();
        console.log(`--------------- RESUMEN RUTA ${route.route_number} ---------------`);
        console.log(`Total de Paradas        : ${route.total_stops}`);
        console.log(`# de Vehículo           : ${route.vehicle_label}`);
        console.log(`Total de Pasajeros      : ${route.total_passengers} / ${route.vehicle_capacity}`);
        console.log(`Tiempo total de Viaje   : ${route.stats.total_travel_time_minutes} minutos`);
        console.log(`Tiempo total de Parada  : ${route.stats.total_stops_time_minutes} minutos`);
        console.log(`Tiempo total de Ruta    : ${route.stats.total_route_time_minutes} minutos / ${route.stats.max_route_time_minutes}`);
        console.log(`Distancia total de Ruta : ${route.stats.total_route_distance_mts / 1000} kms`);
        console.log();
    });
};

/**
 * Creates a response object in the format expected by the API
 * @param {Array} bookings - Array of booking objects
 * @param {Array} routes - Array of route objects
 * @returns {Object} API response object
 */
export const createVisitsAPIResponse = (bookings, routes) => {
    let results = { status: 'Ok' };

    routes.forEach((route, index) => {
        // Create start element (position -1) for each route
        const startElement = {
            num_ruta: index + 1,
            num_viaje: index + 1,
            posicion_en_ruta: -1,
            cod_cliente: 0,
            lat: 0,
            lng: 0,
            distancia: 0,
            tiempo_viaje: 0
        };

        // Get dropoff visits and calculate distances
        const dropoff_visits = route.visits.filter(v => !v.isPickup);
        const cumulativeDistances = getCumulativeDistances(dropoff_visits, route.transitions);

        // Update start element based on first visit
        if (dropoff_visits.length > 0) {
            const firstVisit = dropoff_visits[0];
            const { ref_booking_origin_coordinates } = getReferenceBooking(bookings, firstVisit);
            startElement.lat = ref_booking_origin_coordinates.latitude;
            startElement.lng = ref_booking_origin_coordinates.longitude;
        }

        // Create response array with visit details
        const visitDetails = dropoff_visits.map((visit, visit_index) => {
            const { ref_booking_destination_coordinates } = getReferenceBooking(bookings, visit);
            const bookingId = getBookingIDFromShipment(visit);
            const cumulativeDistance = cumulativeDistances[bookingId];

            return {
                num_ruta: index + 1,
                num_viaje: index + 1,
                posicion_en_ruta: visit_index,
                cod_cliente: bookingId,
                lat: ref_booking_destination_coordinates.latitude,
                lng: ref_booking_destination_coordinates.longitude,
                distancia: cumulativeDistance?.distanceMeters || 0,
                tiempo_viaje: getVisitTravelTime(visit)
            };
        });

        results.responde = [startElement, ...visitDetails];
    });

    return results;
}; 