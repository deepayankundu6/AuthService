#!/bin/bash
RESPONSE=$(curl -X GET "$1/prod/users/authenticate"  -H "x-api-key: $2")
AWS_DEFAULT_REGION=ap-south-1
AWS_SESSION_TOKEN=$(jq -r '.aws_session_token' <<<"$RESPONSE")
AWS_ACCESS_KEY_ID=$(jq -r '.aws_access_key_id' <<<"$RESPONSE") 
AWS_SECRET_ACCESS_KEY=$(jq -r '.aws_secret_access_key' <<<"$RESPONSE")
AWS_DEFAULT_OUTPUT=json
echo "AWS region: $AWS_DEFAULT_REGION"


