# Route Optimization Cloud Function

This Cloud Function uses Google Maps Route Optimization API to optimize vehicle routes for pickups and deliveries.

## Environment Variables

Before deploying, you need to configure the following environment variables:

- `GOOGLE_PROJECT_ID`: Your Google Cloud Platform project ID
- `GOOGLE_CLIENT_EMAIL`: Service account email with permissions for the Route Optimization API
- `GOOGLE_PRIVATE_KEY`: Private key for the service account

## Deployment

To deploy the Cloud Function, use the following gcloud command:

```bash
gcloud functions deploy optimize-routes \
  --runtime=nodejs18 \
  --trigger-http \
  --entry-point=optimizeRouteFunction \
  --allow-unauthenticated
```

## Usage

Send a POST request to the Cloud Function URL with the following JSON structure:

```json
{
  "bookings": [
    {
      "job_id": "12345",
      "pax_count": 2,
      "origin": "AMB Terminal 1",
      "destination": {
        "latitude": -33.4315156504583,
        "longitude": -70.78452621008952
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
```

## Response

The Cloud Function will return an optimized route plan in JSON format. 