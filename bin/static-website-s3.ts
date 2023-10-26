#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StaticWebsiteS3Stack } from '../lib/static-website-s3-stack';
import { StaticWebsiteVpcStack } from '../lib/static-website-vpc-stack';
import { config } from 'dotenv';

// Import environment variables
config();

// Account configuration
const accountConfig = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || process.env.REGION
  }
};

const app = new cdk.App();
const vpcStack = new StaticWebsiteVpcStack(app, 'StaticWebsiteVpcStack', accountConfig);
const s3Stack = new StaticWebsiteS3Stack(app, 'StaticWebsiteS3Stack', accountConfig);

// Call method to update S3 bucket policy
s3Stack.addVpcePolicyToBucket(vpcStack.vpceId);
