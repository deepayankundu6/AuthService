"use strict";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

const getCredentials = async (roleARN: string) => {
  console.log("Assuming the role: ", roleARN);
  const client = new STSClient();
  const timestamp = new Date().getTime();
  const params = {
    RoleArn: roleARN,
    RoleSessionName: `TempRole-${timestamp}`,
    DurationSeconds: Number(process.env["DURATION"]),
  };
  try {
    const command = new AssumeRoleCommand(params);
    const response = await client.send(command);
    if (response.Credentials) {
      const tempObj = {
        aws_access_key_id: response.Credentials.AccessKeyId,
        aws_secret_access_key: response.Credentials.SecretAccessKey,
        aws_session_token: response.Credentials.SessionToken,
        expiration: response.Credentials.Expiration,
      };
      return tempObj;
    } else {
      throw new Error(`Unable to assume role: ${roleARN} `);
    }
  } catch (err: any) {
    console.log("Some error occured while assuming the role: ", err);
    throw new Error(err);
  }
};

const getSecret = async (secretName: string) => {
  console.log("Fetching the role name from secretes manager: ", secretName);
  const client = new SecretsManagerClient();
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );
    if (response) {
      if (response.SecretString) {
        const role = JSON.parse(response.SecretString);
        return role.AuthRole;
      }
      if (response.SecretBinary) {
        const role: any = Buffer.from(response.SecretBinary.buffer).toString();
        return role.AuthRole;
      }
    } else {
      throw new Error("Unable to get the role from the secret managers.");
    }
  } catch (error: any) {
    console.log("Some error occured while getting the role: ", error);
    throw new Error(error);
  }
};

const notifySubscriber = async (SNSArn: string) => {
  console.log("Notifying the user after getting the credentials");
  // Create publish parameters
  const params = {
    Message: `Dear AWS Admin,
    The AWS authentication lambda has been used for generating the auth credential for getting programmatic access to you AWS infrastructure.
    If not intended please take action immediately else it might cause any financial damage to you.
    Thanks & Regards
    AWS Authentication Lambda`,
    Subject: "AWS authentication lambda used for generating credentials",
    TargetArn: SNSArn,
  };
  try {
    const publishWrapper = new PublishCommand(params);
    const snsClient = new SNSClient();
    const response = await snsClient.send(publishWrapper);
    if (response.MessageId) {
      console.log("User successfully notified");
    } else {
      throw new Error("Unable to notify the user");
    }
  } catch (err: any) {
    console.log("Some error occured while notifying the user: ", err);
    throw new Error(err);
  }
};

const authenticateUser = async () => {
  console.log("Lambda execution started!!!");
  let response;
  try {
    const roleFromSM = await getSecret(String(process.env["RoleName"]));
    const credentials = await getCredentials(roleFromSM);
    await notifySubscriber(String(process.env["TopicARN"]));

    response = {
      statusCode: 200,
      body: JSON.stringify(credentials),
    };
  } catch (err: any) {
    console.log("Some error occured: ", err);

    response = {
      statusCode: 500,
      body: JSON.stringify({
        Message: err.message,
        Code: err.Code,
        RequestId: err.code,
        Time: err.time,
      }),
    };
  }
  return response;
};

export { authenticateUser };
