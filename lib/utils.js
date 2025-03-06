/**
 * Format a date object to an ISO string.
 * @param {Date} date - The date to format
 * @returns {string} Formatted ISO date string
 */
export const formatDate = (date) => {
    return date.toISOString();
};

/**
 * Convert a date object to Google Maps API format with seconds and nanos.
 * @param {Date} date - The date to convert
 * @returns {Object} Object with seconds and nanos properties
 */
export const dateToGoogleFormat = (date) => {
    // Return only seconds, omitting nanos which causes validation errors
    return {
        seconds: Math.floor(date.getTime() / 1000)
        // nanos field removed to fix API validation error
    };
};

/**
 * Calculate distance between two coordinate points using Haversine formula.
 * @param {Object} point1 - First point with latitude and longitude properties
 * @param {Object} point2 - Second point with latitude and longitude properties
 * @returns {number} Distance in meters
 */
export const calculateDistance = (point1, point2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in meters
};

/**
 * Parse a CSV file into an array of objects.
 * @param {string} csvData - CSV data as string
 * @returns {Array} Array of objects representing CSV rows
 */
export const parseCSV = (csvData) => {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const values = line.split(',');
        const entry = {};
        
        headers.forEach((header, index) => {
            let value = values[index] ? values[index].trim() : '';
            
            // Try to convert to number if possible
            if (!isNaN(value) && value !== '') {
                value = Number(value);
            }
            
            entry[header] = value;
        });
        
        return entry;
    });
};

/**
 * Group an array of objects by a specified property.
 * @param {Array} array - Array of objects to group
 * @param {string} key - Property name to group by
 * @returns {Object} Object with groups
 */
export const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        result[groupKey] = result[groupKey] || [];
        result[groupKey].push(item);
        return result;
    }, {});
};

/**
 * Checks if an object has all required properties.
 * @param {Object} obj - Object to check
 * @param {Array} requiredProps - Array of required property names
 * @returns {boolean} True if object has all required properties
 */
export const hasRequiredProperties = (obj, requiredProps) => {
    return requiredProps.every(prop => obj.hasOwnProperty(prop) && obj[prop] !== undefined);
}; 