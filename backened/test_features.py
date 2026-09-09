from database.telemetry_db import get_recent_flows

from services.feature_service import FeatureService


flows = get_recent_flows(100)


features = FeatureService.create_features(
    flows
)


print("\nNetwork Features")
print("================")

print(features)