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
* Create a programmatic user under console to use its creds with aws-cli and configure it in CLI
```
$ aws configure
AWS Access Key ID [None]: A*****************7
AWS Secret Access Key [None]: R**************************************M
Default region name [None]: ap-southeast-2
Default output format [None]: json
```

* Now, you should be able to run `cdk diff`
```
$ cdk diff
Stack StaticWebsiteVpcStack
IAM Statement Changes
┌───┬────────────────────────────────────────┬────────┬────────────────┬───────────────────────────┬───────────┐
│   │ Resource                               │ Effect │ Action         │ Principal                 │ Condition │
├───┼────────────────────────────────────────┼────────┼────────────────┼───────────────────────────┼───────────┤
│ + │ ${PrivateInstanceRole.Arn}             │ Allow  │ sts:AssumeRole │ Service:ec2.amazonaws.com │           │
├───┼────────────────────────────────────────┼────────┼────────────────┼───────────────────────────┼───────────┤
│ + │ ${PublicInstanceRole.Arn}              │ Allow  │ sts:AssumeRole │ Service:ec2.amazonaws.com │           │
├───┼────────────────────────────────────────┼────────┼────────────────┼───────────────────────────┼───────────┤
│ + │ arn:aws:s3:::wzag-serverless-website/* │ Allow  │ s3:GetObject   │ AWS:*                     │           │
└───┴────────────────────────────────────────┴────────┴────────────────┴───────────────────────────┴───────────┘
Security Group Changes
┌───┬───────────────────────────────────────┬─────┬────────────┬─────────────────┐
│   │ Group                                 │ Dir │ Protocol   │ Peer            │
├───┼───────────────────────────────────────┼─────┼────────────┼─────────────────┤
│ + │ ${PrivateSubnetSecurityGroup.GroupId} │ In  │ TCP 22     │ Everyone (IPv4) │
│ + │ ${PrivateSubnetSecurityGroup.GroupId} │ In  │ TCP 80     │ Everyone (IPv4) │
│ + │ ${PrivateSubnetSecurityGroup.GroupId} │ In  │ TCP 443    │ Everyone (IPv4) │
│ + │ ${PrivateSubnetSecurityGroup.GroupId} │ Out │ Everything │ Everyone (IPv4) │
├───┼───────────────────────────────────────┼─────┼────────────┼─────────────────┤
│ + │ ${PublicSubnetSecurityGroup.GroupId}  │ In  │ TCP 22     │ Everyone (IPv4) │
│ + │ ${PublicSubnetSecurityGroup.GroupId}  │ In  │ TCP 80     │ Everyone (IPv4) │
│ + │ ${PublicSubnetSecurityGroup.GroupId}  │ In  │ TCP 443    │ Everyone (IPv4) │
│ + │ ${PublicSubnetSecurityGroup.GroupId}  │ Out │ Everything │ Everyone (IPv4) │
└───┴───────────────────────────────────────┴─────┴────────────┴─────────────────┘
(NOTE: There may be security-related changes not in this list. See https://github.com/aws/aws-cdk/issues/1299)

Parameters
...
Other Changes
[+] Unknown Rules: {"CheckBootstrapVersion":{"Assertions":[{"Assert":{"Fn::Not":[{"Fn::Contains":[["1","2","3","4","5"],{"Ref":"BootstrapVersion"}]}]},"AssertDescription":"CDK bootstrap stack version 6 required. Please run 'cdk bootstrap' with a recent version of the CDK CLI."}]}}


✨  Number of stacks with differences: 2
```