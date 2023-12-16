'use strict';
const { STS, SecretsManager, SNS } = require('aws-sdk');

const role = process.env.RoleName;

const getCrossAccountCredentials = async (roleName) => {
  const sts = new STS();
  return new Promise((resolve, reject) => {
    const timestamp = (new Date()).getTime();
    const params = {
      RoleArn: roleName,
      RoleSessionName: `TempRole-${timestamp}`
    };
    sts.assumeRole(params, (err, data) => {
      if (err) reject(err);
      else {
        resolve({
          aws_access_key_id: data.Credentials.AccessKeyId,
          aws_secret_access_key: data.Credentials.SecretAccessKey,
          aws_session_token: data.Credentials.SessionToken,
          Expiration: data.Expiration
        });
      }
    });
  });
}

const getSecret = async (secretName) => {
  const config = { region: process.env.REGION }
  var secret, decodedBinarySecret;
  let secretsManager = new SecretsManager(config);
  try {
    let secretValue = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    if ('SecretString' in secretValue) {
      return secret = secretValue.SecretString;
    } else {
      let buff = new Buffer(secretValue.SecretBinary, 'base64');
      return decodedBinarySecret = buff.toString('ascii');
    }
  } catch (err) {
    if (err.code === 'DecryptionFailureException')
      // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === 'InternalServiceErrorException')
      // An error occurred on the server side.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === 'InvalidParameterException')
      // You provided an invalid value for a parameter.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === 'InvalidRequestException')
      // You provided a parameter value that is not valid for the current state of the resource.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
    else if (err.code === 'ResourceNotFoundException')
      // We can't find the resource that you asked for.
      // Deal with the exception here, and/or rethrow at your discretion.
      throw err;
  }
}

const notifySubscriber = async () => {
  // Create publish parameters
  const params = {
    Message: `Dear AWS Admin,
    The AWS authentication lambda has been used for generating the auth credential for getting programmatic access to you AWS infrastructure.
    If not intended please take action immediately else it might cause any financial damage to you.
    Thanks & Regards
    AWS Authentication Lambda`,
    Subject: 'AWS authentication lambda used for generating credentials',
    TargetArn: process.env.TopicARN
  };

  // Create promise and SNS service object
  const publishTextPromise = new SNS().publish(params).promise();

  // returns promise's fulfilled/rejected states
  return new Promise((resolve, reject) => {

    publishTextPromise.then(
      function (data) {
        console.log(`Notifed the subscribers of the topic ${params.TopicArn}`);
        console.log("MessageID is " + data.MessageId);
        resolve()
      }).catch(
        function (err) {
          reject(err);
        })
  })

}

module.exports.index = async () => {
  console.log("Lambda execution started!!!")
  let response;
  try {
    let roleFromSM = await getSecret(role)
    const roleARN = JSON.parse(roleFromSM).AuthRole
    const credentials = await getCrossAccountCredentials(roleARN);
    await notifySubscriber();

    response = {
      statusCode: 200,
      body: JSON.stringify(credentials),
    }
  } catch (err) {
    console.log("Some error occured: ", err)

    response = {
      statusCode: 500,
      body: JSON.stringify({
        Message: err.message,
        Code: err.Code,
        RequestId: err.code,
        Time: err.time
      }),
    }
  }
  return response;
};

