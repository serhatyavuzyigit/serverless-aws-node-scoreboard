'use strict';
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { v4: uuidv4 } = require('uuid');

const usersTable = process.env.USERS_TABLE;
const sizeTable = process.env.SIZE_TABLE;

function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

function sortByPoint(a, b) {
  if(a.points > b.points) return -1;
  else return 1;
}

module.exports.createUser = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);
  
  const user = {
    user_id: uuidv4(),
    display_name: reqBody.display_name,
    points: 0,
    rank: 1,
    country: reqBody.country
  };
  const userResponse = {
    user_id: user.user_id,
    display_name: user.display_name,
    points: user.points,
    rank: user.rank
  };


  return db
   .put({
     TableName: usersTable,
     Item: user
   })
   .promise()
   .then(() => {
     callback(null, response(201, userResponse));
   })
   .catch((err) => response(null, response(err.statusCode, err)));

};


module.exports.getLeaderboard = (event, context, callback) => {
  return db
    .scan({
      TableName: usersTable
    })
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByPoint)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.getLeaderboardWithCountry = (event, context, callback) => {
  const countryCode = event.pathParameters.countryCode;;
  const params = {
    TableName: usersTable,
    FilterExpression: 'country = :cCode',
    ExpressionAttributeValues:{ ':cCode': countryCode
    }
  };

  return db
    .scan(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByPoint)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.getUser = (event, context, callback) => {
  const id = event.pathParameters.userId;

  const params = {
    Key: {
      user_id: id
    },
    TableName: usersTable
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'User not found' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.submitScore = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);
  const id = reqBody.user_id;
  const score = parseFloat(reqBody.score_worth);

  const params = {
    Key: {
      user_id: id
    },
    TableName: usersTable,
    ConditionExpression: 'attribute_exists(user_id)',
    UpdateExpression: 'SET points = points + :score',
    ExpressionAttributeValues: {
      ':score': score
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  const submitResponse = {
    score_worth: score,
    user_id: id,
    timestamp: Date.now()
  }

  return db
    .update(params)
    .promise()
    .then((res) => {
      console.log(res);
      callback(null, response(200, submitResponse));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};