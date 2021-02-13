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

async function getTotalSize() {
  try {
    const sizeParams = {
      TableName: sizeTable,
      Key: {
        id: "total_size"
      }
    }
    const sizeObj = await db.get(sizeParams).promise()
    return sizeObj.Item.size_value;
  } catch(err) {
    return callback(null, response(err.statusCode, err));
  }
}

function getNewUser(reqBody, size) {
  const user = {
    user_id: uuidv4(),
    display_name: reqBody.display_name,
    points: 0,
    rank: size+1,
    country: reqBody.country
  }
  return user;
}

async function updateSize() {
  const updateParams = {
    Key: {
      id: "total_size"
    },
    TableName: sizeTable,
    UpdateExpression: 'SET size_value = size_value + :inc',
    ExpressionAttributeValues: {
      ':inc': 1
    },
    ReturnValues: 'ALL_NEW'
  }
  await db.update(updateParams).promise();
}

async function putUser(user) {
  await db.put({TableName: usersTable, Item: user}).promise();

}

module.exports.createUser = async(event, context, callback) => {
  const reqBody = JSON.parse(event.body);
  try {
    var totalSize = await getTotalSize();
    const user = getNewUser(reqBody, totalSize);

    const userResponse = {
      user_id: user.user_id,
      display_name: user.display_name,
      points: user.points
    }
    await Promise.all([updateSize(), putUser(user)]);
    return callback(null, response(201, userResponse));
  } catch(err) {
    return callback(null, response(err.statusCode, err));
  }

};


module.exports.getLeaderboard = (event, context, callback) => {
  return db
    .scan({
      TableName: usersTable,
      ScanIndexForward: false
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
    },
    ScanIndexForward: false
  };

  return db
    .scan(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByPoint)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.getUser = async (event, context, callback) => {
  try {
    const id = event.pathParameters.userId;
    const user = await getUserWithId(id);
    return callback(null, response(200, user));
  } catch(err) {
    return callback(null, response(err.statusCode, err));
  }
};

async function getUserWithId(id) {
  const params = {
    ExpressionAttributeValues:{
      ':u_id': id
    },
    KeyConditionExpression: "user_id = :u_id",
    TableName: usersTable
  };

  const user = await db.query(params).promise();
  return user.Items[0];
}

async function deleteUserWithId(id, score) {
  const params = {
    Key: {
      user_id: id,
      points: score
    },
    TableName: usersTable
  };

  await db.delete(params).promise();

}

module.exports.submitScore = async (event, context, callback) => {

  try{
    const reqBody = JSON.parse(event.body);
    const id = reqBody.user_id;
    const score = parseFloat(reqBody.score_worth);
    const user = await getUserWithId(id);
    const exScore = user.points;
    var newScore = exScore + score;
    const _rank = user.rank;
    const _country = user.country;
    const name = user.display_name;

    await deleteUserWithId(id, exScore);

    const submitResponse = {
      score_worth: score,
      user_id: id,
      timestamp: Date.now()
    }

    const newUser = {
      user_id: id,
      display_name: name,
      points: newScore,
      rank: _rank,
      country: _country
    }

    await putUser(newUser);
    return callback(null, response(201, submitResponse));
  } catch(err) {
    return callback(null, response(err.statusCode, err));
  }

};
