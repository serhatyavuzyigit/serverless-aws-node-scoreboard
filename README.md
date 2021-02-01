# serverless-aws-node-scoreboard

## create user
### url
    - https://x2v7hp80cd.execute-api.eu-central-1.amazonaws.com/dev/user/create
    - POST
    - {
        "display_name": "somename",
        "country": "country_code"
      }

## get user 
### url
    - https://x2v7hp80cd.execute-api.eu-central-1.amazonaws.com/dev/user/profile/{userId}

## sumbit score 
### url
    - https://x2v7hp80cd.execute-api.eu-central-1.amazonaws.com/dev/score/submit
    - PUT
    - {
        "score_worth": "<score_as_double>",
        "user_id": "<user_id>"
      }

## get leaderboard 
### url
    - https://x2v7hp80cd.execute-api.eu-central-1.amazonaws.com/dev/leaderboard

## get leaderboard with country
### url
    - https://x2v7hp80cd.execute-api.eu-central-1.amazonaws.com/dev/leaderboard/{countryCode}

