'use strict';
const { STS, SecretsManager } = require('aws-sdk');
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
        });
      }
    });
  });
}

const getSecret = async (secretName) => {
  const config = { region: "ap-south-1" }
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

module.exports.index = async () => {
  console.log("Lambda execution started!!!")
  let response;
  try {
    let roleFromSM = await getSecret(role)
    console.log(roleFromSM)
    console.log(JSON.stringify(roleFromSM))
    console.log(roleFromSM.RoleName)
    const cred = await getCrossAccountCredentials(roleFromSM.RoleName);
    response = {
      statusCode: 200,
      body: JSON.stringify(cred).replace(":", "="),
    }
  } catch (err) {
    console.log("Some error occured: ", err)
    response = {
      statusCode: 500,
      body: JSON.stringify('Some error occured'),
    }
  }
  return response;
};
