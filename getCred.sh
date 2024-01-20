#!/bin/bash
echo "$1/prod/users/authenticate"  -H "x-api-key: $2"
RESPONSE=$(curl -X GET "$1/prod/users/authenticate"  -H "x-api-key: $2")
export AWS_DEFAULT_REGION=ap-south-1
export AWS_SESSION_TOKEN= $(jq -r '.aws_session_token' <<<"$RESPONSE")
export AWS_ACCESS_KEY_ID= $(jq -r '.aws_access_key_id' <<<"$RESPONSE") 
export AWS_SECRET_ACCESS_KEY= $(jq -r '.aws_secret_access_key' <<<"$RESPONSE")
export AWS_DEFAULT_OUTPUT=json


