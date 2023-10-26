# This is an example on how to host SPA static websites in S3

The `cdk.json` file tells the CDK Toolkit how to execute the app.

## Getting started

* `sudo npm install -g aws-cdk`   to install AWS CDK CLI
* `npm install`   to install all dependencies for the project
* `curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"; sudo installer -pkg ./AWSCLIV2.pkg -target /`    to install AWS CLI

## Verifications

```
$ cdk --version
2.103.0 (build d0d7547)

$ aws --version
aws-cli/2.13.29 Python/3.11.6 Darwin/22.6.0 exe/x86_64 prompt/off

$ npx ts-node --version
v10.9.1
```

## AWS account setup

* Add `.env` file containing details around the account ID, which region to use, and the default gateway ID in the account's default VPC
```
ACCOUNT='your account number <123456789>'
REGION='your desired region <us-east-2>'
IGW='internet gateway ID <igw-12abcd45>'
```
* Create a programmatic user under console to use its creds with aws-cli
```
$ aws configure
AWS Access Key ID [None]: A*****************7
AWS Secret Access Key [None]: R**************************************M
Default region name [None]: ap-southeast-2
Default output format [None]: json
```

Now, you should be able to run `cdk diff`
```
$ cdk diff

```